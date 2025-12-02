import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

type Article = {
  id: string;
  name: string;
  image?: string;
  gewicht?: number;
  stueck?: number;
  laenge?: number;
  breite?: number;
  kistenGewicht?: number;
};

@Component({
  selector: 'app-dialog-edit-article',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './dialog-edit-article.component.html',
  styleUrl: './dialog-edit-article.component.scss',
})
export class DialogEditArticleComponent {
  private firestore = inject(Firestore);

  constructor(
    private dialogRef: MatDialogRef<DialogEditArticleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { categoryId: string; article: Article }
  ) {
    this.name          = data.article?.name ?? '';
    this.gewicht       = data.article?.gewicht ?? null;
    this.stueck        = data.article?.stueck ?? null;
    this.laenge        = data.article?.laenge ?? null;
    this.breite        = data.article?.breite ?? null;
    this.kistenGewicht = data.article?.kistenGewicht ?? null;

    // vorhandenes Bild als Startwert behalten
    this.preview     = data.article?.image || null;
    this.imageBase64 = data.article?.image || '';
  }

  // Form-Model
  name = '';
  gewicht: number | null = null;
  stueck: number | null = null;
  laenge: number | null = null;
  breite: number | null = null;
  kistenGewicht: number | null = null;

  imageBase64 = '';
  preview: string | null = null;

  loading = false;
  errorMsg = '';

  onFileSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];

    // WICHTIG: Wenn kein neues Bild gewählt wurde → NICHTS ändern (altes Bild bleibt).
    if (!file) return;

    const r = new FileReader();
    r.onload = () => {
      this.imageBase64 = String(r.result);
      this.preview = this.imageBase64;
    };
    r.readAsDataURL(file);
  }

  async save() {
    this.errorMsg = '';

    const name = this.name.trim();
    if (!name) { this.errorMsg = 'Bitte einen Namen eingeben.'; return; }

    this.loading = true;
    try {
      const path = `categories/${this.data.categoryId}/articles/${this.data.article.id}`;
      const toNum = (v: any) => (v === null || v === undefined || v === '' ? null : +v);

      await updateDoc(doc(this.firestore, path), {
        name,
        image: this.imageBase64 || this.preview || '',
        gewicht: toNum(this.gewicht),
        stueck: toNum(this.stueck),
        laenge: toNum(this.laenge),
        breite: toNum(this.breite),
        kistenGewicht: toNum(this.kistenGewicht),
        updatedAt: Date.now(),
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
}