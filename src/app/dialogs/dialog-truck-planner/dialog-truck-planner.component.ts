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

import { TruckPlannerData, Truck, Box, Crate } from './../../models/truck-planner.types';

@Component({
  selector: 'app-dialog-truck-planner',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './dialog-truck-planner.component.html',
  styleUrl: './dialog-truck-planner.component.scss',
})
export class DialogTruckPlannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas2d', { static: true }) canvas2dRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas3d', { static: true }) canvas3dRef!: ElementRef<HTMLCanvasElement>;

  readonly truck: Truck;
  readonly boxes: Box[];

  truckLength = 8;
  truckWidth = 2.5;

  crates: Crate[] = [];
  overflowCrates: Crate[] = [];

  // 2D
  private ctx!: CanvasRenderingContext2D;
  private readonly SCALE = 80;

  // Drag
  selectedId: string | null = null;
  private selected: Crate | null = null;
  private dragOffsetXpx = 0;
  private dragOffsetYpx = 0;

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

    // Truck Maße
    const defaultWidth = 2.5;
    const defaultLength = 8;

    this.truckWidth = this.truck.width ?? defaultWidth;

    if (this.truck.length) this.truckLength = this.truck.length;
    else if (this.truck.area && this.truckWidth > 0) this.truckLength = this.truck.area / this.truckWidth;
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
    // 2D init
    const canvas2dEl = this.canvas2dRef.nativeElement;
    this.ctx = this.canvas2d.initCanvas(canvas2dEl, this.truckLength, this.truckWidth, this.SCALE);
    this.draw2D();

    // 3D init + start
    const canvas3dEl = this.canvas3dRef.nativeElement;
    this.three3d.init(canvas3dEl, this.truckLength, this.truckWidth, this.crates);
    this.three3d.start();

    // Events
    canvas2dEl.addEventListener('pointerdown', this.onPointerDown);
    canvas2dEl.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    const canvas2dEl = this.canvas2dRef?.nativeElement;
    if (canvas2dEl) {
      canvas2dEl.removeEventListener('pointerdown', this.onPointerDown);
      canvas2dEl.removeEventListener('pointermove', this.onPointerMove);
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
    this.draw2D();

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
    // meshes entfernen
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

    this.selected = null;
    this.selectedId = null;
    this.draw2D();
  }

  rotateSelected(): void {
    if (!this.selectedId) return;
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
    this.draw2D();
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
    this.draw2D();
  }

  // ---------- 2D Drawing ----------

  private draw2D(): void {
    this.canvas2d.draw({
      ctx: this.ctx,
      canvas: this.canvas2dRef.nativeElement,
      crates: this.crates,
      selectedId: this.selectedId,
      truckLength: this.truckLength,
      truckWidth: this.truckWidth,
      scale: this.SCALE,
    });
  }

  // ---------- Drag Handlers ----------

  private onPointerDown = (ev: PointerEvent) => {
    const canvas = this.canvas2dRef.nativeElement;
    const p = this.canvas2d.getCanvasPoint(canvas, ev);
    const hit = this.canvas2d.hitTest(this.crates, p.x, p.y, this.SCALE);
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

    const canvas = this.canvas2dRef.nativeElement;
    const p = this.canvas2d.getCanvasPoint(canvas, ev);

    const newXpx = p.x - this.dragOffsetXpx;
    const newYpx = p.y - this.dragOffsetYpx;

    const candidate: Crate = { ...this.selected };
    candidate.x_m = newXpx / this.SCALE;
    candidate.y_m = newYpx / this.SCALE;

    this.canvas2d.clampToTruck(candidate, this.truckLength, this.truckWidth);

    // Kollision blocken (einfach im Component – keine extra Service-Methoden nötig)
    if (!this.overlaps(candidate, this.selected.id)) {
      this.selected.x_m = candidate.x_m;
      this.selected.y_m = candidate.y_m;

      this.three3d.updateCrateMeshPosition(this.selected);
      this.draw2D();
    }
  };

  private onPointerUp = (_ev: PointerEvent) => {
    this.selected = null;
    this.draw2D();
  };

  private overlaps(test: Crate, skipId: string): boolean {
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

  // ---------- Resize ----------

  private onResize = () => {
    this.three3d.resize(this.canvas3dRef.nativeElement);
  };
}
