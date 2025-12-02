import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-add-article',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule
  ],
  templateUrl: './dialog-add-article.component.html',
  styleUrl: './dialog-add-article.component.scss'
})
export class DialogAddArticleComponent {
  private fs = inject(Firestore);
  constructor(
    private dialogRef: MatDialogRef<DialogAddArticleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { categoryId: string }
  ) {}

  // Felder
  name = '';
  gewicht?: number;
  stueck?: number;
  laenge?: number;
  breite?: number;
  kistenGewicht?: number;

  imageBase64 = '';
  preview: string | null = null;
  loading = false;
  errorMsg = '';

  onFileSelected(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) { this.imageBase64=''; this.preview=null; return; }
    const r = new FileReader();
    r.onload = () => { this.imageBase64 = String(r.result); this.preview = this.imageBase64; };
    r.readAsDataURL(f);
  }

  async save() {
    this.errorMsg = '';
    if (!this.name.trim()) { this.errorMsg = 'Bitte einen Namen eingeben.'; return; }

    this.loading = true;
    try {
      await addDoc(
        collection(this.fs, `categories/${this.data.categoryId}/articles`),
        {
          name: this.name.trim(),
          image: this.imageBase64, 
          gewicht: this.gewicht ?? null,
          stueck: this.stueck ?? null,
          laenge: this.laenge ?? null,
          breite: this.breite ?? null,
          kistenGewicht: this.kistenGewicht ?? null,
          createdAt: Date.now(),
        }
      );
      this.dialogRef.close(true);
    } catch (e: any) {
      console.error(e);
      this.errorMsg = e?.message ?? 'Speichern fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }

  close() { this.dialogRef.close(); }
}