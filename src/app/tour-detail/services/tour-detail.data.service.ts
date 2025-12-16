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
}
