import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

type Truck = {
  id: string; name: string; image?: string;
  length?: number; width?: number; area?: number; maxWeight?: number;
};

@Component({
  selector: 'app-dialog-edit-lkw',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './dialog-edit-lkw.component.html',
  styleUrl: './dialog-edit-lkw.component.scss'
})
export class DialogEditLkwComponent {
  private fs = inject(Firestore);
  constructor(
    private dialogRef: MatDialogRef<DialogEditLkwComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Truck
  ){
    this.name = data.name;
    this.length = data.length ?? null;
    this.width = data.width ?? null;
    this.maxWeight = data.maxWeight ?? null;
    this.preview = data.image || null;
    this.imageBase64 = data.image || '';
  }

  name = '';
  length: number | null = null;
  width: number | null = null;
  maxWeight: number | null = null;
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
    if (!name) { this.errorMsg = 'Bitte Name eingeben.'; return; }

    const toNum = (v:any) => (v === null || v === undefined || v === '' ? null : +v);
    const L = toNum(this.length);
    const W = toNum(this.width);
    const area = (L && W) ? +(L * W).toFixed(2) : null;

    this.loading = true;
    try {
      await updateDoc(doc(this.fs, `trucks/${this.data.id}`), {
        name,
        image: this.imageBase64 || this.preview || '',
        length: L, width: W, area,
        maxWeight: toNum(this.maxWeight),
        updatedAt: Date.now()
      });
      this.dialogRef.close(true);
    } catch (e:any) {
      console.error(e); this.errorMsg = e?.message ?? 'Speichern fehlgeschlagen.';
    } finally { this.loading = false; }
  }

  close(){ this.dialogRef.close(); }
}