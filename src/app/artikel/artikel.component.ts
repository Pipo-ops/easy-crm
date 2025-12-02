import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Firestore, collection, doc, deleteDoc } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { DialogAddCategoryComponent } from '../dialogs/dialog-add-category/dialog-add-category.component';
import { DialogEditCategoryComponent } from '../dialogs/dialog-edit-category/dialog-edit-category.component';

@Component({
  selector: 'app-artikel',
  standalone: true,
  imports: [CommonModule, AsyncPipe, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  templateUrl: './artikel.component.html',
  styleUrl: './artikel.component.scss'
})
export class ArtikelComponent {
  private firestore = inject(Firestore);
  private dialog = inject(MatDialog);

  categories$: Observable<any[]>;

  constructor() {
    const catRef = collection(this.firestore, 'categories');
    this.categories$ = collectionData(catRef, { idField: 'id' }) as Observable<any[]>;
  }

  openDialog() {
    this.dialog.open(DialogAddCategoryComponent, { width: '520px' });
  }

  editCategory(cat: any) {
    this.dialog.open(DialogEditCategoryComponent, { width: '520px', data: cat });
  }

  async deleteCategory(cat: any) {
    if (!confirm(`Kategorie „${cat.name}“ löschen?`)) return;
    await deleteDoc(doc(this.firestore, 'categories', cat.id));
  }
}
