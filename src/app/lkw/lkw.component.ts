// src/app/lkw/lkw.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Firestore, collection, collectionData, doc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { DialogAddLkwComponent } from '../dialogs/dialog-add-lkw/dialog-add-lkw.component';
import { DialogEditLkwComponent } from '../dialogs/dialog-edit-lkw/dialog-edit-lkw.component';

type Truck = {
  id: string;
  name: string;
  image?: string;
  length?: number;   // m
  width?: number;    // m
  maxWeight?: number; // kg
  area?: number;     // m²
};

@Component({
  selector: 'app-lkw',
  standalone: true,
  imports: [CommonModule, AsyncPipe, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  templateUrl: './lkw.component.html',
  styleUrl: './lkw.component.scss'
})
export class LkwComponent {
  private fs = inject(Firestore);
  private dialog = inject(MatDialog);

  trucks$: Observable<Truck[]>;

  constructor() {
    const ref = collection(this.fs, 'trucks');
    this.trucks$ = collectionData(ref, { idField: 'id' }) as Observable<Truck[]>;
  }

  addLkw() {
    this.dialog.open(DialogAddLkwComponent, { width: '520px' });
  }

  editLkw(t: Truck) {
    this.dialog.open(DialogEditLkwComponent, { width: '520px', data: t });
  }

  async deleteLkw(t: Truck) {
    if (!confirm(`„${t.name}“ löschen?`)) return;
    await deleteDoc(doc(this.fs, 'trucks', t.id));
  }
}
