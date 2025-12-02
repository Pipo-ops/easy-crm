// src/app/dialogs/dialog-add-lkw/dialog-add-lkw.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-add-lkw',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './dialog-add-lkw.component.html',
  styleUrl: './dialog-add-lkw.component.scss'
})
export class DialogAddLkwComponent {
  private fs = inject(Firestore);
  constructor(private dialogRef: MatDialogRef<DialogAddLkwComponent>) {}

  name = '';
  length?: number;
  width?: number;
  maxWeight?: number;
  imageBase64 = '';
  preview: string | null = null;
  loading = false;
  errorMsg = '';

  onFileSelected(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { this.imageBase64 = String(r.result); this.preview = this.imageBase64; };
    r.readAsDataURL(f);
  }

  async save() {
    this.errorMsg = '';
    const name = this.name.trim();
    if (!name) { this.errorMsg = 'Bitte Name angeben.'; return; }

    const toNum = (v:any) => (v === null || v === undefined || v === '' ? null : +v);
    const L = toNum(this.length);
    const W = toNum(this.width);
    const area = (L && W) ? +(L * W).toFixed(2) : null;

    this.loading = true;
    try {
      await addDoc(collection(this.fs, 'trucks'), {
        name,
        image: this.imageBase64 || '',
        length: L, width: W,
        area,
        maxWeight: toNum(this.maxWeight),
        createdAt: Date.now()
      });
      this.dialogRef.close(true);
    } catch (e:any) {
      console.error(e); this.errorMsg = e?.message ?? 'Speichern fehlgeschlagen.';
    } finally { this.loading = false; }
  }

  close(){ this.dialogRef.close(); }
}
