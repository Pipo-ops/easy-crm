import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ShortTextPipe } from '../pipes/short-text.pipe';

import {
  Firestore,
  collection,
  collectionData,
  doc,
  deleteDoc,
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';

import { DialogAddTourComponent } from '../dialogs/dialog-add-tour/dialog-add-tour.component';

type Tour = {
  id: string;
  name: string;
  company: string;
  person: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  note?: string;
  createdAt?: number;
};

@Component({
  selector: 'app-truck-routes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    ShortTextPipe,
  ],
  templateUrl: './truck-routes.component.html',
  styleUrl: './truck-routes.component.scss',
})
export class TruckRoutesComponent {
  private fs = inject(Firestore);
  private dialog = inject(MatDialog);

  private readonly LETTER_COLORS: Record<string, string> = {
    A: '#F44336',
    B: '#E91E63',
    C: '#9C27B0',
    D: '#673AB7',
    E: '#3F51B5',
    F: '#2196F3',
    G: '#03A9F4',
    H: '#00BCD4',
    I: '#009688',
    J: '#4CAF50',
    K: '#8BC34A',
    L: '#CDDC39',
    M: '#FFEB3B',
    N: '#FFC107',
    O: '#FF9800',
    P: '#FF5722',
    Q: '#795548',
    R: '#9E9E9E',
    S: '#607D8B',
    T: '#1ABC9C',
    U: '#2ECC71',
    V: '#3498DB',
    W: '#9B59B6',
    X: '#34495E',
    Y: '#F1C40F',
    Z: '#E67E22',
  };

  companyColor(company?: string): string {
    const letter = (company ?? '').trim().charAt(0).toUpperCase();
    return this.LETTER_COLORS[letter] ?? '#9CA3AF'; 
  }

  companyTextColor(bgHex: string): '#111827' | '#ffffff' {
    const c = (bgHex || '').replace('#', '');
    if (c.length !== 6) return '#111827';

    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.65 ? '#111827' : '#ffffff';
  }

  companyInitial(company?: string): string {
    return (company ?? '?').trim().charAt(0).toUpperCase() || '?';
  }

  constructor(private router: Router) {}

  tours$: Observable<Tour[]> = collectionData(collection(this.fs, 'tours'), {
    idField: 'id',
  }).pipe(
    map((list) =>
      (list as Tour[]).sort((a, b) =>
        (a.date ?? '').localeCompare(b.date ?? '')
      )
    )
  );

  startNewTour() {
    this.dialog.open(DialogAddTourComponent, { width: '520px' });
  }

  async deleteTour(t: Tour) {
    if (!confirm(`Tour „${t.name}“ löschen?`)) return;
    await deleteDoc(doc(this.fs, 'tours', t.id));
  }

  openTour(id: string) {
    this.router.navigate(['/tour', id]);
  }
}
