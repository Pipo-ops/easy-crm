import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShortTextPipe } from '../pipes/short-text.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogEditBoxComponent } from '../dialogs/dialog-edit-box/dialog-edit-box.component';
import { DialogTruckPlannerComponent } from '../dialogs/dialog-truck-planner/dialog-truck-planner.component';

import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Article, Box, Category, Tour, Truck } from '../models/tour.models';

import { TourDetailDataService } from './services/tour-detail.data.service';
import { TourDetailBoxCalculatorService } from './services/tour-detail.box-calculator.service';
import { TourDetailTruckPlanningService } from './services/tour-detail.truck-planning.service';
import { TourDetailPrintService } from './services/tour-detail.print.service';

@Component({
  selector: 'app-tour-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    ShortTextPipe,
  ],
  templateUrl: './tour-detail.component.html',
  styleUrl: './tour-detail.component.scss',
})
export class TourDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  private data = inject(TourDetailDataService);
  private boxCalc = inject(TourDetailBoxCalculatorService);
  private truckPlan = inject(TourDetailTruckPlanningService);
  private printService = inject(TourDetailPrintService);

  // ---- Tour-Daten ----
  tour$!: Observable<Tour | null>;
  tourId: string | null = null;
  initialConfirmedTruckIds: string[] = [];

  // ---- LKWs ----
  trucks$!: Observable<Truck[]>;
  allTrucks: Truck[] = [];
  selectedTrucks: Truck[] = [];
  confirmedTrucks: Truck[] = [];

  neededTrucks: number | null = null;
  selectedArea = 0;
  selectedWeight = 0;
  hasEnoughArea = false;
  hasEnoughWeight = false;

  // ---- Stammdaten für Beladungsrechner ----
  categories$!: Observable<Category[]>;
  articles$?: Observable<Article[]>;
  selectedCategory: Category | null = null;
  selectedArticle: Article | null = null;

  amount = 1;
  previewArea = 0;
  previewWeight = 0;

  boxes: Box[] = [];
  totalArea = 0;
  totalWeight = 0;

  trackBox = (_: number, b: Box) => b.id;
  trackTruck = (_: number, t: Truck) => t.id;

  // --- drag & drop ---
  draggingBoxId: string | null = null;

  constructor() {
    this.initStreams();
    this.setupTourSubscription();
    this.setupTruckSubscription();
  }

  goBack() {
    this.router.navigate(['/truck-routes']);
  }

  private initStreams(): void {
    this.tour$ = this.route.paramMap.pipe(
      map((p) => p.get('id')),
      switchMap((id): Observable<Tour | null> => {
        if (!id) return of(null);
        this.tourId = id;
        return this.data.tour$(id);
      })
    );

    this.categories$ = this.data.categories$();
    this.trucks$ = this.route.paramMap.pipe(
      map((p) => p.get('id')),
      switchMap((id) => (id ? this.data.allTrucksForTour$(id) : of([])))
    );
  }

  private setupTourSubscription(): void {
    this.tour$.subscribe((tour) => {
      if (!tour) return;

      this.boxes = tour.boxes ?? [];
      this.initialConfirmedTruckIds = tour.confirmedTruckIds ?? [];

      this.recalcTotals();

      if (this.allTrucks.length && this.initialConfirmedTruckIds.length) {
        const confirmed = this.allTrucks.filter((t) =>
          this.initialConfirmedTruckIds.includes(t.id)
        );
        this.confirmedTrucks = confirmed;
        this.selectedTrucks = [...confirmed];
        this.recalcTotals();
      }
    });
  }

  private setupTruckSubscription(): void {
    this.trucks$.subscribe((trucks) => {
      this.allTrucks = trucks;

      if (this.initialConfirmedTruckIds.length) {
        const confirmed = this.allTrucks.filter((t) =>
          this.initialConfirmedTruckIds.includes(t.id)
        );
        this.confirmedTrucks = confirmed;
        this.selectedTrucks = [...confirmed];
      }

      this.recalcTotals();
    });
  }

  // ---------- Trucks ----------
  toggleTruck(t: Truck) {
    const isSelected = this.selectedTrucks.some((x) => x.id === t.id);

    if (isSelected) {
      // Kisten zurück in Pool
      this.boxes = this.boxes.map((b) =>
        b.truckId === t.id ? { ...b, truckId: null } : b
      );

      // aus Auswahl & bestätigt entfernen
      this.selectedTrucks = this.selectedTrucks.filter((x) => x.id !== t.id);
      this.confirmedTrucks = this.confirmedTrucks.filter((x) => x.id !== t.id);

      this.recalcTotals();
    } else {
      this.selectedTrucks = [...this.selectedTrucks, t];
      this.recalcTotals();
    }
  }

  isSelected(t: Truck): boolean {
    return this.selectedTrucks.some((x) => x.id === t.id);
  }

  confirmTrucks() {
    this.confirmedTrucks = [...this.selectedTrucks];
  }

  // ---------- Beladungsrechner ----------
  onCategoryChange(cat: Category | null) {
    this.selectedCategory = cat;
    this.selectedArticle = null;
    this.amount = 1;
    this.previewArea = 0;
    this.previewWeight = 0;

    if (!cat) {
      this.articles$ = undefined;
      return;
    }

    this.articles$ = this.data.articles$(cat.id);
  }

  onArticleChange(article: Article | null) {
    this.selectedArticle = article;
    this.recalculatePreview();
  }

  onAmountChange() {
    if (this.amount < 1) this.amount = 1;
    this.recalculatePreview();
  }

  private recalculatePreview() {
    const p = this.boxCalc.recalcPreview(this.selectedArticle, this.amount);
    this.previewArea = p.previewArea;
    this.previewWeight = p.previewWeight;
  }

  addBoxes() {
    if (!this.selectedArticle) return;

    this.boxes = this.boxCalc.addBoxesFromArticle(
      this.boxes,
      this.selectedArticle,
      this.amount
    );

    this.recalcTotals();
    this.amount = 1;
    this.recalculatePreview();
  }

  openBoxDialog(box: Box) {
    const ref = this.dialog.open(DialogEditBoxComponent, {
      width: '420px',
      data: box,
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.delete && result.id) {
        this.removeBoxById(result.id);
      }
    });
  }

  private removeBoxById(id: string) {
    this.boxes = this.boxes.filter((b) => b.id !== id);
    this.recalcTotals();
  }

  removeBox(box: Box) {
    this.boxes = this.boxes.filter((b) => b.id !== box.id);
    this.recalcTotals();
  }

  private recalcTotals() {
    const totals = this.boxCalc.recalcTotals(this.boxes);
    this.totalArea = totals.totalArea;
    this.totalWeight = totals.totalWeight;

    this.neededTrucks = this.truckPlan.neededTrucks(
      this.allTrucks,
      this.totalArea,
      this.totalWeight
    );

    const cap = this.truckPlan.updateSelectedCapacity(
      this.selectedTrucks,
      this.totalArea,
      this.totalWeight
    );

    this.selectedArea = cap.selectedArea;
    this.selectedWeight = cap.selectedWeight;
    this.hasEnoughArea = cap.hasEnoughArea;
    this.hasEnoughWeight = cap.hasEnoughWeight;
  }

  // ---------- Pool / Drag&Drop ----------
  get unassignedBoxes(): Box[] {
    return this.boxes.filter((b) => !b.truckId);
  }

  get poolArea(): number {
    return this.unassignedBoxes.reduce((s, b) => s + b.area, 0);
  }

  get poolWeight(): number {
    return this.unassignedBoxes.reduce((s, b) => s + b.weight, 0);
  }

  boxesForTruck(t: Truck): Box[] {
    return this.boxes.filter((b) => b.truckId === t.id);
  }

  onBoxDragStart(ev: DragEvent, box: Box) {
    this.draggingBoxId = box.id;
    ev.dataTransfer?.setData('text/plain', box.id);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  private findDraggedBox(ev: DragEvent): Box | undefined {
    const idFromData = ev.dataTransfer?.getData('text/plain');
    const id = idFromData || this.draggingBoxId;
    if (!id) return;
    return this.boxes.find((b) => b.id === id);
  }

  onDropToPool(ev: DragEvent) {
    ev.preventDefault();
    const box = this.findDraggedBox(ev);
    if (!box) return;

    box.truckId = null;
    this.draggingBoxId = null;
    this.recalcTotals();
  }

  onDropToTruck(ev: DragEvent, truck: Truck) {
    ev.preventDefault();
    const box = this.findDraggedBox(ev);
    if (!box) return;

    box.truckId = truck.id;
    this.draggingBoxId = null;
    this.recalcTotals();
  }

  truckCapacityArea(t: Truck): number {
    return this.truckPlan.areaOfTruck(t);
  }

  truckCapacityWeight(t: Truck): number {
    return t.maxWeight ?? 0;
  }

  truckLoadedArea(t: Truck): number {
    return this.boxesForTruck(t).reduce((s, b) => s + b.area, 0);
  }

  truckLoadedWeight(t: Truck): number {
    return this.boxesForTruck(t).reduce((s, b) => s + b.weight, 0);
  }

  isTruckOverloaded(t: Truck): boolean {
    const capArea = this.truckCapacityArea(t);
    const capWeight = this.truckCapacityWeight(t);
    const loadArea = this.truckLoadedArea(t);
    const loadWeight = this.truckLoadedWeight(t);

    const areaTooMuch = capArea > 0 && loadArea > capArea;
    const weightTooMuch = capWeight > 0 && loadWeight > capWeight;

    return areaTooMuch || weightTooMuch;
  }
  // ---------- extra truck ----------
  async addExtraTruckQuick() {
    if (!this.tourId) return;

    const name = prompt('Name vom Extra-LKW (z.B. Spedition 1):');
    if (!name?.trim()) return;

    const lengthStr = prompt('Länge in m (z.B. 8):', '8');
    const widthStr = prompt('Breite in m (z.B. 2.5):', '2.5');
    const maxWStr = prompt('Max Gewicht in kg (z.B. 12000):', '12000');

    const length = Number(lengthStr);
    const width = Number(widthStr);
    const maxWeight = Number(maxWStr);

    await this.data.addExtraTruck(this.tourId, {
      name: name.trim(),
      length: Number.isFinite(length) ? length : undefined,
      width: Number.isFinite(width) ? width : undefined,
      maxWeight: Number.isFinite(maxWeight) ? maxWeight : undefined,
      area:
        Number.isFinite(length) && Number.isFinite(width)
          ? +(length * width).toFixed(2)
          : undefined,
      image: null as any, // optional
    });
  }

  // ---------- Save / AutoAssign / Planner ----------
  async saveTourState() {
    if (!this.tourId) return;

    const confirmedTruckIds = this.confirmedTrucks.map((t) => t.id);

    const payload: Partial<Tour> = {
      boxes: this.boxes,
      confirmedTruckIds,
    };

    try {
      await this.data.saveTourState(this.tourId, payload);
      console.log('Tour gespeichert');
    } catch (err) {
      console.error('Fehler beim Speichern', err);
    }
  }

  autoAssignToTrucks() {
    if (!this.confirmedTrucks.length) {
      alert('Bitte zuerst LKW Auswahl übernehmen.');
      return;
    }

    const pool = this.unassignedBoxes.map((b) => ({ ...b }));
    if (!pool.length) {
      alert('Keine unzugeordneten Kisten vorhanden.');
      return;
    }

    for (const truck of this.confirmedTrucks) {
      const placedIds = this.truckPlan.tryPackBoxesIntoTruck(pool, truck);

      this.boxes = this.boxes.map((b) => {
        const placed = placedIds.get(b.id);
        if (!placed) return b;

        return {
          ...b,
          truckId: truck.id,
          x_m: placed.x_m,
          y_m: placed.y_m,
          w_m: placed.w_m,
          h_m: placed.h_m,
        };
      });

      for (const id of placedIds.keys()) {
        const idx = pool.findIndex((x) => x.id === id);
        if (idx !== -1) pool.splice(idx, 1);
      }

      if (!pool.length) break;
    }

    if (pool.length) {
      alert(
        `Nicht alles passt in die ausgewählten LKWs. Übrig: ${pool.length} Kisten.`
      );
    }

    this.recalcTotals();
  }

  openTruckPlanner(truck: Truck) {
    const boxesForTruck = this.boxesForTruck(truck);

    const ref = this.dialog.open(DialogTruckPlannerComponent, {
      width: '1000px',
      maxWidth: '95vw',
      height: '90vh',
      data: { truck, boxes: boxesForTruck },
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.ok || !Array.isArray(res.layout)) return;

      const map = new Map<string, any>(res.layout.map((x: any) => [x.id, x]));

      this.boxes = this.boxes.map((b) => {
        if (b.truckId !== truck.id) return b;
        const l = map.get(b.id);
        if (!l) return b;
        return { ...b, x_m: l.x_m, y_m: l.y_m, w_m: l.w_m, h_m: l.h_m };
      });

      this.recalcTotals();
    });
  }

  printConfirmedTrucks() {
    this.printService.printConfirmedTrucks(
      this.confirmedTrucks,
      this.boxes,
      {
        boxesForTruck: (t) => this.boxesForTruck(t),
        truckCapacityArea: (t) => this.truckCapacityArea(t),
        truckCapacityWeight: (t) => this.truckCapacityWeight(t),
        truckLoadedArea: (t) => this.truckLoadedArea(t),
        truckLoadedWeight: (t) => this.truckLoadedWeight(t),
        isTruckOverloaded: (t) => this.isTruckOverloaded(t),
      },
      'Tour Übersicht'
    );
  }
}
