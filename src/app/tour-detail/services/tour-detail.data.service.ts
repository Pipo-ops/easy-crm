import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  collection,
  collectionData,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Article, Category, Tour, Truck } from '../../models/tour.models';
import { addDoc } from '@angular/fire/firestore';
import { combineLatest, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TourDetailDataService {
  private fs = inject(Firestore);

  tour$(id: string): Observable<Tour> {
    const ref = doc(this.fs, 'tours', id);
    return docData(ref, { idField: 'id' }) as Observable<Tour>;
  }

  trucks$(): Observable<Truck[]> {
    const ref = collection(this.fs, 'trucks');
    return collectionData(ref, { idField: 'id' }) as Observable<Truck[]>;
  }

  categories$(): Observable<Category[]> {
    const ref = collection(this.fs, 'categories');
    return collectionData(ref, { idField: 'id' }) as Observable<Category[]>;
  }

  articles$(catId: string): Observable<Article[]> {
    const ref = collection(this.fs, `categories/${catId}/articles`);
    return collectionData(ref, { idField: 'id' }) as Observable<Article[]>;
  }

  saveTourState(tourId: string, payload: Partial<Tour>) {
    const ref = doc(this.fs, 'tours', tourId);
    return updateDoc(ref, payload);
  }

  extraTrucks$(tourId: string): Observable<Truck[]> {
    const ref = collection(this.fs, `tours/${tourId}/extraTrucks`);
    return collectionData(ref, { idField: 'id' }) as Observable<Truck[]>;
  }

  allTrucksForTour$(tourId: string): Observable<Truck[]> {
    return combineLatest([this.trucks$(), this.extraTrucks$(tourId)]).pipe(
      map(([global, extra]) => [
        ...global.map((t) => ({ ...t, isExtra: false })),
        ...extra.map((t) => ({ ...t, isExtra: true, tourId })),
      ])
    );
  }

  addExtraTruck(tourId: string, truck: Omit<Truck, 'id'>) {
    const ref = collection(this.fs, `tours/${tourId}/extraTrucks`);
    return addDoc(ref, { ...truck, createdAt: Date.now() });
  }
}
