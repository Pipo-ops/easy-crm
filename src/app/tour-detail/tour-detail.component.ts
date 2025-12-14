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

import {
  Firestore,
  doc,
  docData,
  collection,
  collectionData,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Article, Box, Category, Tour, Truck } from '../models/tour.models';

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
  private fs = inject(Firestore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // ---- Tour-Daten ----
  tour$!: Observable<Tour | null>;
  tourId: string | null = null;
  initialConfirmedTruckIds: string[] = [];

  // ---- LKWs ----
  trucks$!: Observable<Truck[]>;
  allTrucks: Truck[] = []; // alle verfügbaren LKWs
  selectedTrucks: Truck[] = [];
  confirmedTrucks: Truck[] = []; // für später Drag & Drop

  neededTrucks: number | null = null; // minimal benötigte LKW-Anzahl (exakt)
  selectedArea = 0;
  selectedWeight = 0;
  hasEnoughArea = false;
  hasEnoughWeight = false;

  // ---- Stammdaten für Beladungsrechner ----
  categories$!: Observable<Category[]>;
  articles$?: Observable<Article[]>;
  selectedCategory: Category | null = null;
  selectedArticle: Article | null = null;

  amount = 1; // gewünschte Stückzahl (gesamt)
  previewArea = 0; // m² für aktuelle Eingabe
  previewWeight = 0; // kg für aktuelle Eingabe

  boxes: Box[] = []; // alle Kisten in dieser Session
  totalArea = 0; // m² Summe aller Kisten
  totalWeight = 0; // kg Summe aller Kisten

  trackBox = (_: number, b: Box) => b.id;
  trackTruck = (_: number, t: Truck) => t.id;

  // --- drag & drop ---
  draggingBoxId: string | null = null;

  goBack() {
    this.router.navigate(['/truck-routes']);
  }

  constructor() {
    this.initTourStream();
    this.initCategoryStream();
    this.initTruckStream();
    this.setupTourSubscription();
    this.setupTruckSubscription();
  }

  private initTourStream(): void {
    this.tour$ = this.route.paramMap.pipe(
      map((p) => p.get('id')),
      switchMap((id: string | null): Observable<Tour | null> => {
        if (!id) return of(null);
        this.tourId = id;
        const tourRef = doc(this.fs, 'tours', id);
        return docData(tourRef, { idField: 'id' }) as Observable<Tour>;
      })
    );
  }

  private setupTourSubscription(): void {
    this.tour$.subscribe((tour) => {
      if (!tour) return;

      this.boxes = tour.boxes ?? [];
      this.recalcTotals();

      this.initialConfirmedTruckIds = tour.confirmedTruckIds ?? [];

      // Falls Trucks schon geladen sind, direkt mappen
      if (this.allTrucks.length && this.initialConfirmedTruckIds.length) {
        const confirmed = this.allTrucks.filter((t) =>
          this.initialConfirmedTruckIds.includes(t.id)
        );
        this.confirmedTrucks = confirmed;
        this.selectedTrucks = [...confirmed];
      }
    });
  }

  private initCategoryStream(): void {
    const catRef = collection(this.fs, 'categories');
    this.categories$ = collectionData(catRef, {
      idField: 'id',
    }) as Observable<Category[]>;
  }

  private initTruckStream(): void {
    const truckRef = collection(this.fs, 'trucks');
    this.trucks$ = collectionData(truckRef, {
      idField: 'id',
    }) as Observable<Truck[]>;
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

      this.updateNeededTrucks();
      this.updateSelectedCapacity();
    });
  }

  toggleTruck(t: Truck) {
    const isSelected = this.selectedTrucks.some((x) => x.id === t.id);

    if (isSelected) {
      // 1. alle Kisten aus diesem LKW zurück in den Pool
      this.boxes.forEach((box) => {
        if (box.truckId === t.id) {
          box.truckId = null;
        }
      });

      // 2. LKW aus der Auswahl entfernen
      this.selectedTrucks = this.selectedTrucks.filter((x) => x.id !== t.id);

      // 3. LKW auch aus den eingesetzten LKWs entfernen
      this.confirmedTrucks = this.confirmedTrucks.filter((x) => x.id !== t.id);

      // 4. Totals neu berechnen, weil Kisten sich geändert haben
      this.recalcTotals();
    } else {
      // LKW wird neu ausgewählt (nur oben gelb markieren)
      this.selectedTrucks = [...this.selectedTrucks, t];
    }

    // Kapazität für aktuelle Auswahl aktualisieren
    this.updateSelectedCapacity();
  }

  isSelected(t: Truck): boolean {
    return this.selectedTrucks.some((x) => x.id === t.id);
  }

  // Kapazität der ausgewählten LKWs berechnen
  private updateSelectedCapacity() {
    const areaOf = (t: Truck) => t.area ?? (t.length ?? 0) * (t.width ?? 0);

    this.selectedArea = this.selectedTrucks.reduce(
      (s, t) => s + (areaOf(t) || 0),
      0
    );
    this.selectedWeight = this.selectedTrucks.reduce(
      (s, t) => s + (t.maxWeight ?? 0),
      0
    );

    this.hasEnoughArea = this.selectedArea >= this.totalArea;
    this.hasEnoughWeight = this.selectedWeight >= this.totalWeight;
  }

  // ----------- Beladungsrechner-Logik -----------

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

    const artRef = collection(this.fs, `categories/${cat.id}/articles`);
    this.articles$ = collectionData(artRef, {
      idField: 'id',
    }) as Observable<Article[]>;
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
    const art = this.selectedArticle;
    const qty = this.amount || 0;

    if (!art || qty <= 0) {
      this.previewArea = 0;
      this.previewWeight = 0;
      return;
    }

    const stueckProKiste = art.stueck ?? 1;
    const kistenAnzahl = Math.ceil(qty / stueckProKiste);
    const flaecheProKiste = ((art.laenge ?? 0) * (art.breite ?? 0)) / 10000; // cm² -> m²

    let area = 0;
    let weight = 0;

    for (let i = 0; i < kistenAnzahl; i++) {
      const stueckInDieserKiste =
        i === kistenAnzahl - 1
          ? qty % stueckProKiste || stueckProKiste
          : stueckProKiste;

      const kistenGewicht =
        (art.gewicht ?? 0) * stueckInDieserKiste + (art.kistenGewicht ?? 0);

      area += flaecheProKiste;
      weight += kistenGewicht;
    }

    this.previewArea = +area.toFixed(2);
    this.previewWeight = +weight.toFixed(2);
  }

  addBoxes() {
    const art = this.selectedArticle;
    const qty = this.amount || 0;
    if (!art || qty <= 0) return;

    const lengthCm = art.laenge ?? 0;
    const widthCm = art.breite ?? 0;

    const lengthM = lengthCm / 100;
    const widthM = widthCm / 100;

    const stueckProKiste = art.stueck ?? 1;
    const kistenAnzahl = Math.ceil(qty / stueckProKiste);
    const flaecheProKiste = (lengthCm * widthCm) / 10000; // cm² -> m²

    for (let i = 0; i < kistenAnzahl; i++) {
      const stueckInDieserKiste =
        i === kistenAnzahl - 1
          ? qty % stueckProKiste || stueckProKiste
          : stueckProKiste;

      const kistenGewicht =
        (art.gewicht ?? 0) * stueckInDieserKiste + (art.kistenGewicht ?? 0);

      this.boxes.push({
        id:
          (crypto as any).randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        articleName: art.name,
        pieces: stueckInDieserKiste,
        area: +flaecheProKiste.toFixed(2),
        weight: +kistenGewicht.toFixed(2),
        truckId: null,

        // ✅ echte Maße
        lengthM: lengthM > 0 ? +lengthM.toFixed(2) : undefined,
        widthM: widthM > 0 ? +widthM.toFixed(2) : undefined,
        heightM: 1,

        // ✅ Original (optional)
        lengthCm: lengthCm || undefined,
        widthCm: widthCm || undefined,
      });
    }

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
    this.totalArea = this.boxes.reduce((s, b) => s + b.area, 0);
    this.totalWeight = this.boxes.reduce((s, b) => s + b.weight, 0);

    this.updateNeededTrucks();
    this.updateSelectedCapacity();
  }

  private updateNeededTrucks() {
    const totalA = this.totalArea;
    const totalW = this.totalWeight;

    if ((!totalA && !totalW) || !this.allTrucks.length) {
      this.neededTrucks = 0;
      return;
    }

    // Fläche jedes LKWs normalisieren
    const trucks = this.allTrucks
      .map((t) => ({
        area: t.area ?? (t.length ?? 0) * (t.width ?? 0),
        weight: t.maxWeight ?? 0,
      }))
      .filter((t) => t.area > 0 || t.weight > 0);

    const n = trucks.length;
    if (!n) {
      this.neededTrucks = null;
      return;
    }

    let best = Infinity;
    const maxMask = 1 << n;

    for (let mask = 1; mask < maxMask; mask++) {
      let a = 0;
      let w = 0;
      let count = 0;

      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          count++;
          a += trucks[i].area;
          w += trucks[i].weight;
        }
      }

      if (a >= totalA && w >= totalW && count < best) {
        best = count;
      }
    }

    this.neededTrucks = Number.isFinite(best) ? best : null;
  }

  // Auswahl bestätigen (für späteres Drag & Drop)
  confirmTrucks() {
    this.confirmedTrucks = [...this.selectedTrucks];
  }

  // nur Kisten ohne LKW im oberen Streifen anzeigen
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
    ev.preventDefault(); // erlaubt Drop
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
    return t.area ?? (t.length ?? 0) * (t.width ?? 0);
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

  // --- Speichern und löschen der Tour
  async saveTourState() {
    if (!this.tourId) return;

    const tourRef = doc(this.fs, 'tours', this.tourId);

    const confirmedTruckIds = this.confirmedTrucks.map((t) => t.id);

    const payload: Partial<Tour> = {
      boxes: this.boxes,
      confirmedTruckIds,
    };

    try {
      await updateDoc(tourRef, payload);
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

    // nur unzugeordnete Kisten einräumen
    const pool = this.unassignedBoxes.map((b) => ({ ...b }));

    if (!pool.length) {
      alert('Keine unzugeordneten Kisten vorhanden.');
      return;
    }

    // wir räumen nach Truck-Reihenfolge ein
    for (const truck of this.confirmedTrucks) {
      const placedIds = this.tryPackBoxesIntoTruck(pool, truck);

      // truckId setzen + optional Layout speichern
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

      // aus pool entfernen
      for (const id of placedIds.keys()) {
        const idx = pool.findIndex((x) => x.id === id);
        if (idx !== -1) pool.splice(idx, 1);
      }

      if (!pool.length) break; // alles eingeräumt
    }

    // wenn noch was übrig ist -> Info
    if (pool.length) {
      alert(
        `Nicht alles passt in die ausgewählten LKWs. Übrig: ${pool.length} Kisten.`
      );
    }

    this.recalcTotals();
  }

  /** Packt so viele Boxen wie möglich in EINEN Truck (2D), gibt Layout pro Box zurück */
  private tryPackBoxesIntoTruck(
    pool: Box[],
    truck: Truck
  ): Map<string, { x_m: number; y_m: number; w_m: number; h_m: number }> {
    const result = new Map<
      string,
      { x_m: number; y_m: number; w_m: number; h_m: number }
    >();

    const truckWidth = truck.width ?? 2.5;
    const truckLength =
      truck.length ??
      (truck.area && truckWidth > 0 ? truck.area / truckWidth : 8);

    // Kandidaten: größte zuerst (nach Fläche)
    const candidates = [...pool].sort((a, b) => {
      const aw = a.lengthM ?? Math.sqrt(a.area || 1);
      const ah = a.widthM ?? Math.sqrt(a.area || 1);
      const bw = b.lengthM ?? Math.sqrt(b.area || 1);
      const bh = b.widthM ?? Math.sqrt(b.area || 1);
      return bw * bh - aw * ah;
    });

    const placed: { id: string; x: number; y: number; w: number; h: number }[] =
      [];

    const step = 0.05; // 5cm Raster

    const fitsNoOverlap = (
      x: number,
      y: number,
      w: number,
      h: number,
      id: string
    ) => {
      if (x < 0 || y < 0) return false;
      if (x + w > truckLength + 1e-6) return false;
      if (y + h > truckWidth + 1e-6) return false;

      for (const p of placed) {
        const overlap =
          x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y;

        if (overlap) return false;
      }
      return true;
    };

    const placeOne = (box: Box): boolean => {
      const hasDims = !!(
        box.lengthM &&
        box.widthM &&
        box.lengthM > 0 &&
        box.widthM > 0
      );
      const w0 = hasDims ? box.lengthM! : Math.sqrt(box.area || 1);
      const h0 = hasDims ? box.widthM! : Math.sqrt(box.area || 1);

      const options = [
        { w: w0, h: h0 },
        { w: h0, h: w0 }, // drehen erlauben
      ];

      for (const opt of options) {
        for (let y = 0; y <= truckWidth - opt.h + 1e-6; y += step) {
          for (let x = 0; x <= truckLength - opt.w + 1e-6; x += step) {
            if (fitsNoOverlap(x, y, opt.w, opt.h, box.id)) {
              placed.push({ id: box.id, x, y, w: opt.w, h: opt.h });
              result.set(box.id, {
                x_m: +x.toFixed(3),
                y_m: +y.toFixed(3),
                w_m: +opt.w.toFixed(3),
                h_m: +opt.h.toFixed(3),
              });
              return true;
            }
          }
        }
      }
      return false;
    };

    for (const b of candidates) {
      // Gewicht grob prüfen (optional)
      // Wenn du willst, kann ich pro Truck auch maxWeight beachten.
      placeOne(b);
    }

    return result;
  }

  openTruckPlanner(truck: Truck) {
    const boxesForTruck = this.boxesForTruck(truck);

    const ref = this.dialog.open(DialogTruckPlannerComponent, {
      width: '1000px',
      maxWidth: '95vw',
      height: '90vh',
      data: {
        truck,
        boxes: boxesForTruck,
      },
    });

    ref.afterClosed().subscribe(async (res) => {
      if (!res?.ok || !Array.isArray(res.layout)) return;

      // layout: [{id,x_m,y_m,w_m,h_m}]
      const map = new Map<string, any>(res.layout.map((x: any) => [x.id, x]));

      // ✅ Boxes updaten (nur die vom Truck)
      this.boxes = this.boxes.map((b) => {
        if (b.truckId !== truck.id) return b;

        const l = map.get(b.id);
        if (!l) return b;

        return {
          ...b,
          x_m: l.x_m,
          y_m: l.y_m,
          w_m: l.w_m,
          h_m: l.h_m,
        };
      });

      this.recalcTotals();
    });
  }
}
