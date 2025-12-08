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

type Tour = {
  id: string;
  name: string;
  person: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note?: string | null;
  createdAt?: number;
  boxes?: Box[];
  confirmedTruckIds?: string[];
};

type Truck = {
  id: string;
  name: string;
  image?: string;
  length?: number;
  width?: number;
  area?: number; // m²
  maxWeight?: number; // kg
};

type Category = {
  id: string;
  name: string;
  image?: string;
};

type Article = {
  id: string;
  name: string;
  image?: string;
  gewicht?: number; // Gewicht pro Stück (kg)
  stueck?: number; // Stück pro Kiste
  laenge?: number; // cm
  breite?: number; // cm
  kistenGewicht?: number; // kg
};

type Box = {
  id: string;
  articleName: string;
  pieces: number;
  area: number; // m²
  weight: number; // kg
  truckId?: string | null;
};

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

      if (this.allTrucks.length) {
        this.confirmedTrucks = this.allTrucks.filter((t) =>
          this.initialConfirmedTruckIds.includes(t.id)
        );
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
        this.confirmedTrucks = this.allTrucks.filter((t) =>
          this.initialConfirmedTruckIds.includes(t.id)
        );
      }

      this.updateNeededTrucks();
      this.updateSelectedCapacity();
    });
  }

  toggleTruck(t: Truck) {
    const exists = this.selectedTrucks.find((x) => x.id === t.id);
    if (exists) {
      this.selectedTrucks = this.selectedTrucks.filter((x) => x.id !== t.id);
    } else {
      this.selectedTrucks = [...this.selectedTrucks, t];
    }
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

    const stueckProKiste = art.stueck ?? 1;
    const kistenAnzahl = Math.ceil(qty / stueckProKiste);
    const flaecheProKiste = ((art.laenge ?? 0) * (art.breite ?? 0)) / 10000; // cm² -> m²

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
      });
    }

    this.recalcTotals();
    // Eingabe zurücksetzen
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

  async deleteTour() {
    if (!this.tourId) return;

    const ok = confirm('Tour wirklich löschen?');
    if (!ok) return;

    const tourRef = doc(this.fs, 'tours', this.tourId);

    try {
      await deleteDoc(tourRef);
      // zurück zur Übersicht
      this.router.navigate(['/truck-routes']);
    } catch (err) {
      console.error('Fehler beim Löschen', err);
    }
  }

}
