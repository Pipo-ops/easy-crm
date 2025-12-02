import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-add-category',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './dialog-add-category.component.html',
  styleUrl: './dialog-add-category.component.scss'
})
export class DialogAddCategoryComponent {
  private dialogRef = inject(MatDialogRef<DialogAddCategoryComponent>);
  private firestore = inject(Firestore);

  name = '';
  file: File | null = null;
  previewUrl: string | null = null;
  imageBase64 = '';
  loading = false;
  errorMsg = '';

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.previewUrl = this.file ? URL.createObjectURL(this.file) : null;

    if (this.file) {
      const reader = new FileReader();
      reader.onload = () => this.imageBase64 = String(reader.result);
      reader.readAsDataURL(this.file);
    } else {
      this.imageBase64 = '';
    }
  }

  async save() {
    if (!this.name.trim()) { this.errorMsg = 'Bitte Name eingeben.'; return; }

    this.loading = true;
    try {
      const categoriesRef = collection(this.firestore, 'categories');
      await addDoc(categoriesRef, {
        name: this.capitalize(this.name),
        image: this.imageBase64,   
        createdAt: Date.now(),
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

  private capitalize(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  }
}
