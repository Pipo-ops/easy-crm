import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { DialogTruckPlannerPrintService } from './services/dialog-truck-planner.print.service';
import { DialogTruckPlannerPackingService } from './services/dialog-truck-planner.packing.service';
import { DialogTruckPlannerCanvas2DService } from './services/dialog-truck-planner.canvas2d.service';
import { DialogTruckPlannerThree3DService } from './services/dialog-truck-planner.three3d.service';

import {
  TruckPlannerData,
  Truck,
  Box,
  Crate,
} from './../../models/truck-planner.types';

@Component({
  selector: 'app-dialog-truck-planner',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './dialog-truck-planner.component.html',
  styleUrl: './dialog-truck-planner.component.scss',
})
export class DialogTruckPlannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas2d', { static: true }) canvas2dRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasOverflow', { static: true }) canvasOverflowRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas3d', { static: true }) canvas3dRef!: ElementRef<HTMLCanvasElement>;

  readonly truck: Truck;
  readonly boxes: Box[];

  truckLength = 8;
  truckWidth = 2.5;

  crates: Crate[] = [];
  overflowCrates: Crate[] = [];

  // 2D
  private ctx!: CanvasRenderingContext2D;
  private ctxOverflow!: CanvasRenderingContext2D;
  private readonly SCALE = 80;

  // Selection (für Rotate-Button)
  selectedId: string | null = null;

  // Drag intern
  private selected: Crate | null = null;
  private dragSource: 'truck' | 'overflow' | null = null;
  private dragOffsetXpx = 0;
  private dragOffsetYpx = 0;

  // Click vs Drag
  private pointerDownPos: { x: number; y: number } | null = null;
  private isDragging = false;
  private readonly DRAG_THRESHOLD_PX = 4;

  // Für "frei ziehen", aber beim Drop nicht überlappen
  private lastValidPos: { x_m: number; y_m: number } | null = null;

  // Services
  private printService = inject(DialogTruckPlannerPrintService);
  private packing = inject(DialogTruckPlannerPackingService);
  private canvas2d = inject(DialogTruckPlannerCanvas2DService);
  private three3d = inject(DialogTruckPlannerThree3DService);

  trackCrate = (_: number, c: Crate) => c.id;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: TruckPlannerData,
    private dialogRef: MatDialogRef<DialogTruckPlannerComponent>
  ) {
    this.truck = data.truck;
    this.boxes = data.boxes ?? [];

    // --- Maße sauber übernehmen (wie in deinem Original) ---
    const defaultWidth = 2.5;
    const defaultLength = 8;

    this.truckWidth = this.truck.width ?? defaultWidth;

    if (this.truck.length) this.truckLength = this.truck.length;
    else if (this.truck.area && this.truckWidth > 0)
      this.truckLength = this.truck.area / this.truckWidth;
    else this.truckLength = defaultLength;

    const { packed, overflow } = this.packing.buildAndPackCrates({
      boxes: this.boxes,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
    });

    this.crates = packed;
    this.overflowCrates = overflow;
  }

  ngAfterViewInit(): void {
    // 2D Truck
    const canvasTruck = this.canvas2dRef.nativeElement;
    this.ctx = this.canvas2d.initCanvas(
      canvasTruck,
      this.truckLength,
      this.truckWidth,
      this.SCALE
    );

    // 2D Overflow (duplizierter "Truck")
    const canvasOverflow = this.canvasOverflowRef.nativeElement;
    this.ctxOverflow = this.canvas2d.initCanvas(
      canvasOverflow,
      this.truckLength,
      this.truckWidth,
      this.SCALE
    );

    this.drawAll();

    // 3D init + start
    const canvas3dEl = this.canvas3dRef.nativeElement;
    this.three3d.init(canvas3dEl, this.truckLength, this.truckWidth, this.crates);
    this.three3d.start();

    // Pointer Events (beide Canvas)
    canvasTruck.addEventListener('pointerdown', this.onPointerDownTruck);
    canvasTruck.addEventListener('pointermove', this.onPointerMove);
    canvasTruck.addEventListener('dblclick', this.onDoubleClickTruck as any);

    canvasOverflow.addEventListener('pointerdown', this.onPointerDownOverflow);
    canvasOverflow.addEventListener('pointermove', this.onPointerMove);
    canvasOverflow.addEventListener('dblclick', this.onDoubleClickOverflow as any);

    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    const canvasTruck = this.canvas2dRef?.nativeElement;
    const canvasOverflow = this.canvasOverflowRef?.nativeElement;

    if (canvasTruck) {
      canvasTruck.removeEventListener('pointerdown', this.onPointerDownTruck);
      canvasTruck.removeEventListener('pointermove', this.onPointerMove);
      canvasTruck.removeEventListener('dblclick', this.onDoubleClickTruck as any);
    }

    if (canvasOverflow) {
      canvasOverflow.removeEventListener('pointerdown', this.onPointerDownOverflow);
      canvasOverflow.removeEventListener('pointermove', this.onPointerMove);
      canvasOverflow.removeEventListener('dblclick', this.onDoubleClickOverflow as any);
    }

    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);

    this.three3d.dispose();
  }

  // ---------- UI Actions ----------

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

  printPlan(): void {
    this.drawAll();

    this.printService.printPlan({
      title: 'LKW Ladeflächen Planer',
      truck: this.truck,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
      crates: this.crates,
      overflowCrates: this.overflowCrates,
      canvas2d: this.canvas2dRef.nativeElement,
      canvas3d: this.canvas3dRef?.nativeElement,
      include3d: false,
    });
  }

  autoLayout(): void {
    // 3D: meshes entfernen
    for (const c of this.crates) this.three3d.removeCrateMesh(c);

    const { packed, overflow } = this.packing.autoLayout({
      crates: this.crates,
      overflow: this.overflowCrates,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
    });

    this.crates = packed;
    this.overflowCrates = overflow;

    for (const c of this.crates) this.three3d.createOrUpdateCrateMesh(c);

    this.selectedId = null;
    this.resetDragState();
    this.drawAll();
  }

  rotateSelected(): void {
    if (!this.selectedId) return;

    // Drehen ist nur im LKW sinnvoll (bei Overflow kannst du es auch erlauben,
    // aber dann brauchst du ggf. eigene Checks – hier bleiben wir bei LKW)
    const c = this.crates.find((x) => x.id === this.selectedId);
    if (!c) return;

    const ok = this.packing.rotateIfFits({
      crate: c,
      crates: this.crates,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
    });

    if (!ok) return;

    this.three3d.createOrUpdateCrateMesh(c);
    this.drawAll();
  }

  placeOverflowCrate(id: string): void {
    const idx = this.overflowCrates.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const crate = this.overflowCrates[idx];

    const placed = this.packing.placeOverflowCrate({
      crate,
      crates: this.crates,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
    });

    if (!placed) return;

    this.overflowCrates.splice(idx, 1);
    this.crates.push(crate);

    this.three3d.createOrUpdateCrateMesh(crate);
    this.drawAll();
  }

  // ---------- Drawing ----------

  private drawAll(): void {
    // LKW
    this.canvas2d.draw({
      ctx: this.ctx,
      canvas: this.canvas2dRef.nativeElement,
      crates: this.crates,
      selectedId: this.selectedId,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
      scale: this.SCALE,
    });

    // Ablage
    this.canvas2d.draw({
      ctx: this.ctxOverflow,
      canvas: this.canvasOverflowRef.nativeElement,
      crates: this.overflowCrates,
      selectedId: this.selectedId,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
      scale: this.SCALE,
    });
  }

  // ---------- Pointer Down (Select + Drag vorbereiten) ----------

  private onPointerDownTruck = (ev: PointerEvent) => {
    const canvas = this.canvas2dRef.nativeElement;
    const p = this.canvas2d.getCanvasPoint(canvas, ev);

    const hit = this.canvas2d.hitTest(this.crates, p.x, p.y, this.SCALE);
    if (!hit) return;

    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);

    // Klick = auswählen (damit Button sofort geht)
    this.selectedId = hit.id;

    // Drag vorbereiten
    this.selected = hit;
    this.dragSource = 'truck';
    this.pointerDownPos = { x: p.x, y: p.y };
    this.isDragging = false;

    this.lastValidPos = { x_m: hit.x_m, y_m: hit.y_m };

    const hitX = hit.x_m * this.SCALE;
    const hitY = hit.y_m * this.SCALE;
    this.dragOffsetXpx = p.x - hitX;
    this.dragOffsetYpx = p.y - hitY;

    this.drawAll();
  };

  private onPointerDownOverflow = (ev: PointerEvent) => {
    const canvas = this.canvasOverflowRef.nativeElement;
    const p = this.canvas2d.getCanvasPoint(canvas, ev);

    const hit = this.canvas2d.hitTest(this.overflowCrates, p.x, p.y, this.SCALE);
    if (!hit) return;

    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);

    // Klick = auswählen
    this.selectedId = hit.id;

    // Drag vorbereiten
    this.selected = hit;
    this.dragSource = 'overflow';
    this.pointerDownPos = { x: p.x, y: p.y };
    this.isDragging = false;

    this.lastValidPos = { x_m: hit.x_m, y_m: hit.y_m };

    const hitX = hit.x_m * this.SCALE;
    const hitY = hit.y_m * this.SCALE;
    this.dragOffsetXpx = p.x - hitX;
    this.dragOffsetYpx = p.y - hitY;

    this.drawAll();
  };

  // ---------- Pointer Move (Drag startet erst nach Threshold) ----------

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.selected || !this.dragSource) return;

    const area = this.whichArea(ev);
    const canvas =
      area === 'truck'
        ? this.canvas2dRef.nativeElement
        : this.canvasOverflowRef.nativeElement;

    const p = this.canvas2d.getCanvasPoint(canvas, ev);

    // Drag erst starten wenn Bewegung groß genug
    if (!this.isDragging) {
      if (!this.pointerDownPos) return;

      const dx = p.x - this.pointerDownPos.x;
      const dy = p.y - this.pointerDownPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.DRAG_THRESHOLD_PX) {
        // nur klicken/hovern -> kein drag
        return;
      }

      this.isDragging = true;

      // bring to front im jeweiligen Array
      if (this.dragSource === 'truck') {
        const hit = this.selected;
        this.crates = this.crates.filter((x) => x.id !== hit.id).concat(hit);
      } else {
        const hit = this.selected;
        this.overflowCrates = this.overflowCrates
          .filter((x) => x.id !== hit.id)
          .concat(hit);
      }
    }

    // Kandidat position (Preview darf überall hin, clamp nur in Ziel-Fläche)
    const newXpx = p.x - this.dragOffsetXpx;
    const newYpx = p.y - this.dragOffsetYpx;

    const candidate: Crate = { ...this.selected };
    candidate.x_m = newXpx / this.SCALE;
    candidate.y_m = newYpx / this.SCALE;

    // Ziel-Fläche clampen (Truck/Ablage haben gleiche Maße)
    this.canvas2d.clampToTruck(candidate, this.truckLength, this.truckWidth);

    // Preview immer übernehmen (kein Hängenbleiben)
    this.selected.x_m = candidate.x_m;
    this.selected.y_m = candidate.y_m;

    // letzte gültige Position nur relevant wenn Ziel = Truck und ohne Overlap
    if (area === 'truck') {
      const ok = !this.overlaps(candidate, this.selected.id);
      if (ok) this.lastValidPos = { x_m: candidate.x_m, y_m: candidate.y_m };
    } else {
      // in Ablage: immer ok
      this.lastValidPos = { x_m: candidate.x_m, y_m: candidate.y_m };
    }

    // 3D nur updaten wenn die Kiste aktuell aus dem LKW kommt (Mesh existiert)
    if (this.dragSource === 'truck') {
      this.three3d.updateCrateMeshPosition(this.selected);
    }

    this.drawAll();
  };

  // ---------- Pointer Up (wenn kein Drag: nur Auswahl; sonst Drop-Logik) ----------

  private onPointerUp = (ev: PointerEvent) => {
    if (!this.selected || !this.dragSource) {
      this.resetDragState();
      return;
    }

    // Kein Drag = nur auswählen, nichts verschieben
    if (!this.isDragging) {
      this.selected = null;
      this.dragSource = null;
      this.pointerDownPos = null;
      this.isDragging = false;
      this.lastValidPos = null;
      this.drawAll();
      return;
    }

    const dropArea = this.whichArea(ev);

    if (dropArea === 'truck') {
      // Drop im LKW: darf nicht überlappen
      const isOver = this.overlaps(this.selected, this.selected.id);

      if (isOver) {
        // zurück zur letzten gültigen Position
        if (this.lastValidPos) {
          this.selected.x_m = this.lastValidPos.x_m;
          this.selected.y_m = this.lastValidPos.y_m;
          if (this.dragSource === 'truck') {
            this.three3d.updateCrateMeshPosition(this.selected);
          }
        }
      } else {
        // gültiger Drop im LKW: wenn Quelle Overflow -> rüberziehen + 3D mesh erstellen
        if (this.dragSource === 'overflow') {
          const idx = this.overflowCrates.findIndex((x) => x.id === this.selected!.id);
          if (idx !== -1) {
            const crate = this.overflowCrates.splice(idx, 1)[0];
            // Position aus "selected" übernehmen
            crate.x_m = this.selected.x_m;
            crate.y_m = this.selected.y_m;
            this.crates.push(crate);

            this.three3d.createOrUpdateCrateMesh(crate);
          }
        }
      }
    } else {
      // Drop in Ablage: wenn Quelle Truck -> rausnehmen + 3D mesh entfernen
      if (this.dragSource === 'truck') {
        const idx = this.crates.findIndex((x) => x.id === this.selected!.id);
        if (idx !== -1) {
          const crate = this.crates.splice(idx, 1)[0];
          crate.x_m = this.selected.x_m;
          crate.y_m = this.selected.y_m;
          this.overflowCrates.push(crate);

          this.three3d.removeCrateMesh(crate);
        }
      }
    }

    this.resetDragState();
    this.drawAll();
  };

  // ---------- Double Click: nur auswählen (damit Rotate Button easy ist) ----------

  private onDoubleClickTruck = (ev: MouseEvent) => {
    const canvas = this.canvas2dRef.nativeElement;
    const p = this.canvas2d.getCanvasPoint(canvas, ev as any);

    const hit = this.canvas2d.hitTest(this.crates, p.x, p.y, this.SCALE);
    if (!hit) return;

    this.selectedId = hit.id;
    this.drawAll();

    // OPTIONAL: wenn du willst, dass Doppelklick direkt dreht:
    // this.rotateSelected();
  };

  private onDoubleClickOverflow = (ev: MouseEvent) => {
    const canvas = this.canvasOverflowRef.nativeElement;
    const p = this.canvas2d.getCanvasPoint(canvas, ev as any);

    const hit = this.canvas2d.hitTest(this.overflowCrates, p.x, p.y, this.SCALE);
    if (!hit) return;

    this.selectedId = hit.id;
    this.drawAll();

    // OPTIONAL: wenn du willst, dass Doppelklick direkt dreht:
    // this.rotateSelected();
  };

  // ---------- Helpers ----------

  private whichArea(ev: PointerEvent): 'truck' | 'overflow' {
    const rTruck = this.canvas2dRef.nativeElement.getBoundingClientRect();
    const x = ev.clientX;
    const y = ev.clientY;

    const inTruck =
      x >= rTruck.left && x <= rTruck.right && y >= rTruck.top && y <= rTruck.bottom;

    return inTruck ? 'truck' : 'overflow';
  }

  private overlaps(test: Crate, skipId: string): boolean {
    // nur Kollisionen innerhalb des LKW (crates)
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

  private resetDragState(): void {
    this.selected = null;
    this.dragSource = null;
    this.pointerDownPos = null;
    this.isDragging = false;
    this.lastValidPos = null;
  }

  // ---------- Resize ----------

  private onResize = () => {
    this.three3d.resize(this.canvas3dRef.nativeElement);
  };
}