import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Truck = {
  id: string;
  name: string;
  length?: number; // m
  width?: number; // m
  area?: number; // m²
  maxWeight?: number; // kg
};

type Box = {
  id: string;
  articleName: string;
  pieces: number;
  area: number; // m² (UI gerundet)
  weight: number; // kg
  truckId?: string | null;

  // echte Maße für Packing
  lengthM?: number; // m
  widthM?: number; // m
  heightM?: number; // m

  x_m?: number;
  y_m?: number;
  w_m?: number;
  h_m?: number;
};

export interface TruckPlannerData {
  truck: Truck;
  boxes: Box[];
}

interface Crate {
  id: string;
  name: string;
  x_m: number;
  y_m: number;
  w_m: number; // entlang Länge
  h_m: number; // entlang Breite
  depth_m: number; // Höhe für 3D
  color: string;
  mesh?: THREE.Mesh;
}

@Component({
  selector: 'app-dialog-truck-planner',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './dialog-truck-planner.component.html',
  styleUrl: './dialog-truck-planner.component.scss',
})
export class DialogTruckPlannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas2d', { static: true })
  canvas2dRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas3d', { static: true })
  canvas3dRef!: ElementRef<HTMLCanvasElement>;

  readonly truck: Truck;
  readonly boxes: Box[];

  truckLength = 8;
  truckWidth = 2.5;

  // 2D
  private ctx!: CanvasRenderingContext2D;
  private readonly SCALE = 80; // px pro Meter

  // Drag
  selectedId: string | null = null;
  private selected: Crate | null = null;
  private dragOffsetXpx = 0;
  private dragOffsetYpx = 0;

  // 3D
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId: number | null = null;

  crates: Crate[] = [];
  overflowCrates: Crate[] = [];

  trackCrate = (_: number, c: Crate) => c.id;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: TruckPlannerData,
    private dialogRef: MatDialogRef<DialogTruckPlannerComponent>
  ) {
    this.truck = data.truck;
    this.boxes = data.boxes ?? [];

    // --- Truck Maße ---
    const defaultWidth = 2.5;
    const defaultLength = 8;

    this.truckWidth = this.truck.width ?? defaultWidth;

    if (this.truck.length) {
      this.truckLength = this.truck.length;
    } else if (this.truck.area && this.truckWidth > 0) {
      this.truckLength = this.truck.area / this.truckWidth;
    } else {
      this.truckLength = defaultLength;
    }

    const { packed, overflow } = this.buildAndPackCrates();
    this.crates = packed;
    this.overflowCrates = overflow;
  }

  // ---------------- Lifecycle ----------------

  ngAfterViewInit(): void {
    this.init2D();
    this.draw2D();

    this.init3D();
    this.animate3D();

    const c = this.canvas2dRef.nativeElement;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    const c = this.canvas2dRef?.nativeElement;
    if (c) {
      c.removeEventListener('pointerdown', this.onPointerDown);
      c.removeEventListener('pointermove', this.onPointerMove);
    }
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);

    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    if (this.renderer) this.renderer.dispose();
  }

  // ---------------- Build + Pack ----------------

  private buildAndPackCrates(): { packed: Crate[]; overflow: Crate[] } {
    const colors = [
      '#34D399',
      '#60A5FA',
      '#FCD34D',
      '#A78BFA',
      '#FB7185',
      '#22c55e',
      '#f97316',
      '#06b6d4',
    ];

    const placed: Crate[] = [];
    const unplaced: Crate[] = [];

    // 1) Crates aus Boxes bauen
    const all: Crate[] = this.boxes.map((b, i) => {
      const hasDims = b.lengthM && b.widthM && b.lengthM > 0 && b.widthM > 0;

      const wFromDims = hasDims ? b.lengthM! : Math.sqrt(b.area || 1);
      const hFromDims = hasDims ? b.widthM! : Math.sqrt(b.area || 1);

      const c: Crate = {
        id: b.id,
        name: b.articleName,
        x_m: 0,
        y_m: 0,
        w_m: Math.max(0.01, wFromDims),
        h_m: Math.max(0.01, hFromDims),
        depth_m: b.heightM ?? 1,
        color: colors[i % colors.length],
      };

      // ✅ gespeichertes Layout übernehmen (wenn vorhanden)
      if (this.hasSavedLayout(b)) {
        c.x_m = b.x_m!;
        c.y_m = b.y_m!;
        c.w_m = b.w_m!;
        c.h_m = b.h_m!;
      }

      return c;
    });

    // 2) Gespeicherte Positionen zuerst übernehmen (nur wenn gültig)
    for (const c of all) {
      const originalHadLayout = this.boxes.some(
        (b) => b.id === c.id && this.hasSavedLayout(b)
      );

      if (!originalHadLayout) {
        unplaced.push(c);
        continue;
      }

      // Bounds check
      if (this.checkBounds(c)) {
        unplaced.push({ ...c, x_m: 0, y_m: 0 }); // ungültig -> neu platzieren
        continue;
      }

      // Collision check gegen bereits platzierte
      if (this.checkCollisionAgainstList(c, placed)) {
        unplaced.push({ ...c, x_m: 0, y_m: 0 });
        continue;
      }

      placed.push(c);
    }

    // 3) Rest automatisch packen (in freien Bereich)
    //    Dafür packen wir “unplaced” zuerst grob und versuchen dann,
    //    jeden so zu setzen, dass er nicht mit “placed” kollidiert.
    const { packed, overflow } = this.packCratesGreedy(unplaced, true);

    // packed sind relativ zu 0/0 gerechnet – wir legen sie in die erste freie Stelle ohne Kollision
    for (const c of packed) {
      // versuche an exakt der Position, ansonsten suche Raster
      const ok =
        (!this.checkBounds(c) && !this.checkCollisionAgainstList(c, placed)) ||
        this.tryPlaceAtFirstFreeSpotWithPlaced(c, c.w_m, c.h_m, placed) ||
        this.tryPlaceAtFirstFreeSpotWithPlaced(c, c.h_m, c.w_m, placed);

      if (ok) placed.push(c);
      else overflow.push(c);
    }

    // 4) overflow bleibt overflow
    return { packed: placed, overflow };
  }

  private checkCollisionAgainstList(test: Crate, list: Crate[]): boolean {
    for (const other of list) {
      if (other.id === test.id) continue;

      const overlap =
        test.x_m < other.x_m + other.w_m &&
        test.x_m + test.w_m > other.x_m &&
        test.y_m < other.y_m + other.h_m &&
        test.y_m + test.h_m > other.y_m;

      if (overlap) return true;
    }
    return false;
  }

  private tryPlaceAtFirstFreeSpotWithPlaced(
    crate: Crate,
    w: number,
    h: number,
    placed: Crate[]
  ): boolean {
    const step = 0.05; // 5cm Raster

    const test: Crate = { ...crate, w_m: w, h_m: h, x_m: 0, y_m: 0 };

    for (let y = 0; y <= this.truckWidth - h + 1e-6; y += step) {
      for (let x = 0; x <= this.truckLength - w + 1e-6; x += step) {
        test.x_m = +x.toFixed(3);
        test.y_m = +y.toFixed(3);

        if (this.checkBounds(test)) continue;
        if (this.checkCollisionAgainstList(test, placed)) continue;

        crate.x_m = test.x_m;
        crate.y_m = test.y_m;
        crate.w_m = w;
        crate.h_m = h;
        return true;
      }
    }
    return false;
  }

  private packCratesGreedy(
    crates: Crate[],
    allowRotate = true
  ): { packed: Crate[]; overflow: Crate[] } {
    const packed: Crate[] = [];
    const overflow: Crate[] = [];

    // große zuerst
    const sorted = [...crates].sort((a, b) => b.w_m * b.h_m - a.w_m * a.h_m);

    let x = 0;
    let y = 0;
    let rowH = 0;

    for (const c of sorted) {
      const opts = allowRotate
        ? [
            { w: c.w_m, h: c.h_m },
            { w: c.h_m, h: c.w_m },
          ]
        : [{ w: c.w_m, h: c.h_m }];

      let placed = false;

      for (const opt of opts) {
        if (x + opt.w > this.truckLength) {
          x = 0;
          y += rowH;
          rowH = 0;
        }

        if (y + opt.h > this.truckWidth) continue;

        c.x_m = x;
        c.y_m = y;
        c.w_m = opt.w;
        c.h_m = opt.h;

        packed.push(c);
        x += opt.w;
        rowH = Math.max(rowH, opt.h);
        placed = true;
        break;
      }

      if (!placed) overflow.push(c);
    }

    return { packed, overflow };
  }

  // ---------------- Manual Place Overflow ----------------

  placeOverflowCrate(id: string): void {
    const idx = this.overflowCrates.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const crate = this.overflowCrates[idx];

    // versuche normale Ausrichtung, dann gedreht
    const placed =
      this.tryPlaceAtFirstFreeSpot(crate, crate.w_m, crate.h_m) ||
      this.tryPlaceAtFirstFreeSpot(crate, crate.h_m, crate.w_m);

    if (!placed) return;

    // aus overflow raus, in crates rein
    this.overflowCrates.splice(idx, 1);
    this.crates.push(crate);

    // 3D Mesh anlegen
    this.createOrUpdateCrateMesh(crate);

    this.draw2D();
  }

  private tryPlaceAtFirstFreeSpot(crate: Crate, w: number, h: number): boolean {
    const step = 0.05; // 5cm Raster-Suche (stabil & schnell genug)

    const test: Crate = { ...crate, w_m: w, h_m: h, x_m: 0, y_m: 0 };

    for (let y = 0; y <= this.truckWidth - h + 1e-6; y += step) {
      for (let x = 0; x <= this.truckLength - w + 1e-6; x += step) {
        test.x_m = +x.toFixed(3);
        test.y_m = +y.toFixed(3);

        if (this.checkBounds(test)) continue;
        if (this.checkCollision(test, crate.id)) continue;

        // passt!
        crate.x_m = test.x_m;
        crate.y_m = test.y_m;
        crate.w_m = w;
        crate.h_m = h;
        return true;
      }
    }
    return false;
  }

  // ---------------- Rotate ----------------

  rotateSelected(): void {
    if (!this.selectedId) return;
    const c = this.crates.find((x) => x.id === this.selectedId);
    if (!c) return;

    const candidate: Crate = { ...c, w_m: c.h_m, h_m: c.w_m };

    if (this.checkBounds(candidate)) return;
    if (this.checkCollision(candidate, c.id)) return;

    c.w_m = candidate.w_m;
    c.h_m = candidate.h_m;

    this.createOrUpdateCrateMesh(c);
    this.draw2D();
  }

  // ---------------- Auto layout ----------------

  autoLayout(): void {
    // alles (crates + overflow) neu packen
    const all = [...this.crates, ...this.overflowCrates].map(
      (c) =>
        ({
          ...c,
          x_m: 0,
          y_m: 0,
          mesh: undefined,
        } as Crate)
    );

    // 3D Szene von Meshes säubern
    for (const c of this.crates) {
      if (c.mesh) {
        this.scene?.remove(c.mesh);
        c.mesh.geometry.dispose();
        (c.mesh.material as any)?.dispose?.();
      }
      c.mesh = undefined;
    }

    const { packed, overflow } = this.packCratesGreedy(all, true);
    this.crates = packed;
    this.overflowCrates = overflow;

    // Meshes neu erzeugen
    for (const c of this.crates) this.createOrUpdateCrateMesh(c);

    this.selected = null;
    this.selectedId = null;
    this.draw2D();
  }

  // ---------------- 2D ----------------

  private init2D(): void {
    const canvas = this.canvas2dRef.nativeElement;
    canvas.width = Math.max(1, Math.round(this.truckLength * this.SCALE));
    canvas.height = Math.max(1, Math.round(this.truckWidth * this.SCALE));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Context not available');
    this.ctx = ctx;
  }

  private draw2D(): void {
    const canvas = this.canvas2dRef.nativeElement;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Truck border
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // crates
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const crate of this.crates) {
      const x = crate.x_m * this.SCALE;
      const y = crate.y_m * this.SCALE;
      const w = crate.w_m * this.SCALE;
      const h = crate.h_m * this.SCALE;

      // Box
      ctx.fillStyle = crate.color;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = this.selectedId === crate.id ? 4 : 2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // ✅ Label (immer versuchen)
      this.drawCrateLabel(ctx, crate.name, crate.color, x, y, w, h);
    }
  }

  private drawCrateLabel(
    ctx: CanvasRenderingContext2D,
    name: string,
    bgColor: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const pad = 4;

    // zu klein? gar nicht versuchen
    if (w < 16 || h < 12) return;

    // Label-Variante je nach Platz
    let label = '';
    if (w >= 90 && h >= 28) {
      label = this.ellipsize(name, 18); // voller Name (gekürzt)
    } else if (w >= 55 && h >= 22) {
      label = this.ellipsize(name, 10); // kürzer
    } else if (w >= 26 && h >= 16) {
      label = this.initials(name, 2); // Initialen (z.B. BT)
    } else {
      label = this.initials(name, 1); // 1 Buchstabe
    }

    // Schriftgröße abhängig von Höhe
    const fontSize = h >= 40 ? 14 : h >= 28 ? 12 : h >= 20 ? 10 : 9;

    ctx.font = `600 ${fontSize}px Inter`;

    // Textfarbe automatisch (hell/dunkel)
    const textColor = this.getReadableTextColor(bgColor);

    // Wenn Text nicht reinpasst -> runterstufen (Name -> Initialen)
    const maxWidth = w - pad * 2;
    if (ctx.measureText(label).width > maxWidth) {
      label = this.initials(name, 2);
      if (ctx.measureText(label).width > maxWidth) {
        label = this.initials(name, 1);
      }
    }

    // Outline damit es immer lesbar bleibt
    ctx.lineWidth = 3;
    ctx.strokeStyle =
      textColor === '#111827' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)';
    ctx.strokeText(label, x + w / 2, y + h / 2);

    ctx.fillStyle = textColor;
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private ellipsize(text: string, maxChars: number): string {
    const t = (text ?? '').trim();
    if (t.length <= maxChars) return t;
    return t.slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
  }

  private initials(text: string, maxLetters: number): string {
    const parts = (text ?? '')
      .trim()
      .split(/[\s\-_]+/)
      .filter(Boolean);

    if (!parts.length) return '?';

    const chars = parts
      .slice(0, maxLetters)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');

    return chars || '?';
  }

  private getReadableTextColor(hex: string): '#111827' | '#ffffff' {
    // akzeptiert "#RRGGBB"
    const c = (hex || '').replace('#', '');
    if (c.length !== 6) return '#111827';

    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);

    // relative luminance (einfach)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.6 ? '#111827' : '#ffffff';
  }

  private getCanvasPoint(ev: PointerEvent): { x: number; y: number } {
    const canvas = this.canvas2dRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const xRel = ev.clientX - rect.left;
    const yRel = ev.clientY - rect.top;

    const x = xRel * (canvas.width / rect.width);
    const y = yRel * (canvas.height / rect.height);
    return { x, y };
  }

  private hitTest(px: number, py: number): Crate | null {
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      const x = c.x_m * this.SCALE;
      const y = c.y_m * this.SCALE;
      const w = c.w_m * this.SCALE;
      const h = c.h_m * this.SCALE;

      if (px >= x && px <= x + w && py >= y && py <= y + h) return c;
    }
    return null;
  }

  private checkCollision(test: Crate, skipId: string): boolean {
    for (const other of this.crates) {
      if (other.id === skipId) continue;

      const overlap =
        test.x_m < other.x_m + other.w_m &&
        test.x_m + test.w_m > other.x_m &&
        test.y_m < other.y_m + other.h_m &&
        test.y_m + test.h_m > other.y_m;

      if (overlap) return true;
    }
    return false;
  }

  private checkBounds(c: Crate): boolean {
    return (
      c.x_m < -1e-6 ||
      c.y_m < -1e-6 ||
      c.x_m + c.w_m > this.truckLength + 1e-6 ||
      c.y_m + c.h_m > this.truckWidth + 1e-6
    );
  }

  private clampToTruck(c: Crate): void {
    c.x_m = Math.max(0, Math.min(this.truckLength - c.w_m, c.x_m));
    c.y_m = Math.max(0, Math.min(this.truckWidth - c.h_m, c.y_m));
  }

  private onPointerDown = (ev: PointerEvent) => {
    const p = this.getCanvasPoint(ev);
    const hit = this.hitTest(p.x, p.y);
    if (!hit) return;

    ev.preventDefault();

    this.selected = hit;
    this.selectedId = hit.id;

    const hitX = hit.x_m * this.SCALE;
    const hitY = hit.y_m * this.SCALE;

    this.dragOffsetXpx = p.x - hitX;
    this.dragOffsetYpx = p.y - hitY;

    // bring to front
    this.crates = this.crates.filter((x) => x.id !== hit.id).concat(hit);

    this.draw2D();
  };

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.selected) return;
    ev.preventDefault();

    const p = this.getCanvasPoint(ev);
    const newXpx = p.x - this.dragOffsetXpx;
    const newYpx = p.y - this.dragOffsetYpx;

    const candidate: Crate = { ...this.selected };
    candidate.x_m = newXpx / this.SCALE;
    candidate.y_m = newYpx / this.SCALE;

    this.clampToTruck(candidate);

    // Kollision blocken
    if (!this.checkCollision(candidate, this.selected.id)) {
      this.selected.x_m = candidate.x_m;
      this.selected.y_m = candidate.y_m;

      this.updateCrateMeshPosition(this.selected);
      this.draw2D();
    }
  };

  private onPointerUp = (_ev: PointerEvent) => {
    this.selected = null;
    this.draw2D();
  };

  // ---------------- 3D ----------------

  private init3D(): void {
    const canvas = this.canvas3dRef.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf3f4f6);

    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 320;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    this.camera.position.set(
      this.truckLength * 0.8,
      this.truckLength * 0.8,
      this.truckWidth * 1.6
    );
    this.camera.lookAt(this.truckLength / 2, 0, this.truckWidth / 2);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 60;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 10, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    // truck bed
    const bedGeom = new THREE.BoxGeometry(
      this.truckLength,
      0.1,
      this.truckWidth
    );
    const bedMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
    const bedMesh = new THREE.Mesh(bedGeom, bedMat);
    bedMesh.position.set(this.truckLength / 2, -0.05, this.truckWidth / 2);
    bedMesh.receiveShadow = true;
    this.scene.add(bedMesh);

    // meshes
    for (const c of this.crates) this.createOrUpdateCrateMesh(c);
  }

  private createOrUpdateCrateMesh(crate: Crate): void {
    if (!this.scene) return;

    // remove old
    if (crate.mesh) {
      this.scene.remove(crate.mesh);
      crate.mesh.geometry.dispose();
      (crate.mesh.material as any)?.dispose?.();
      crate.mesh = undefined;
    }

    const geom = new THREE.BoxGeometry(crate.w_m, crate.depth_m, crate.h_m);
    const mat = new THREE.MeshPhongMaterial({
      color: crate.color,
      shininess: 30,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;

    crate.mesh = mesh;
    this.scene.add(mesh);
    this.updateCrateMeshPosition(crate);
  }

  private updateCrateMeshPosition(crate: Crate): void {
    if (!crate.mesh) return;
    crate.mesh.position.x = crate.x_m + crate.w_m / 2;
    crate.mesh.position.z = crate.y_m + crate.h_m / 2;
    crate.mesh.position.y = crate.depth_m / 2;
  }

  private animate3D = () => {
    this.animationId = requestAnimationFrame(this.animate3D);
    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.camera || !this.renderer) return;
    const canvas = this.canvas3dRef.nativeElement;

    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 320;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // ---------------- Actions ----------------

  close(): void {
    this.dialogRef.close();
  }

  apply(): void {
    const layout = this.crates.map((c) => ({
      id: c.id,
      x_m: +c.x_m.toFixed(3),
      y_m: +c.y_m.toFixed(3),
      w_m: +c.w_m.toFixed(3),
      h_m: +c.h_m.toFixed(3),
    }));

    this.dialogRef.close({ ok: true, layout });
  }

  private hasSavedLayout(b: Box): boolean {
    return (
      typeof b.x_m === 'number' &&
      typeof b.y_m === 'number' &&
      typeof b.w_m === 'number' &&
      typeof b.h_m === 'number' &&
      b.w_m > 0 &&
      b.h_m > 0
    );
  }
}
