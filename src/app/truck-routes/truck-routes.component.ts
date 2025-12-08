import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';

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
  ],
  templateUrl: './truck-routes.component.html',
  styleUrl: './truck-routes.component.scss',
})
export class TruckRoutesComponent {
  private fs = inject(Firestore);
  private dialog = inject(MatDialog);

  constructor(private router: Router) {}

  tours$: Observable<Tour[]> = collectionData(collection(this.fs, 'tours'), {
    idField: 'id',
  }).pipe(
    map((list) =>
      (list as Tour[])
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
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
