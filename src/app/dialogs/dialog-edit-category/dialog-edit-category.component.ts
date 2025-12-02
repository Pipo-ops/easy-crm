import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-edit-category',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './dialog-edit-category.component.html',
  styleUrl: './dialog-edit-category.component.scss'
})
export class DialogEditCategoryComponent {
  private dialogRef = inject(MatDialogRef<DialogEditCategoryComponent>);
  private firestore = inject(Firestore);

  name = '';
  image = '';
  previewUrl: string | null = null;
  file: File | null = null;
  loading = false;
  errorMsg = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.name = data?.name ?? '';
    this.image = data?.image ?? '';
    this.previewUrl = this.image || null;
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    if (this.file) {
      const reader = new FileReader();
      reader.onload = () => { this.image = String(reader.result); this.previewUrl = this.image; };
      reader.readAsDataURL(this.file);
    }
  }

  async save() {
    if (!this.name.trim()) { this.errorMsg = 'Bitte Name eingeben.'; return; }
    this.loading = true;
    try {
      const ref = doc(this.firestore, 'categories', this.data.id);
      await updateDoc(ref, {
        name: this.capitalize(this.name),
        image: this.image,
      });
      this.dialogRef.close(true);
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Speichern fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }

  close() { this.dialogRef.close(); }

  private capitalize(s: string) { return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s; }
}
