import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-add-tour',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './dialog-add-tour.component.html',
  styleUrl: './dialog-add-tour.component.scss',
})
export class DialogAddTourComponent {
  private fs = inject(Firestore);
  constructor(private dialogRef: MatDialogRef<DialogAddTourComponent>) {}

  name = '';
  company = '';
  person = '';
  date: Date | null = null;  // <-- WICHTIG!
  startTime = '';
  endTime = '';
  note = '';

  loading = false;
  errorMsg = '';

  async save() {
    this.errorMsg = '';

    if (
      !this.name.trim() ||
      !this.company.trim() ||
      !this.person.trim() ||
      !this.date ||
      !this.startTime ||
      !this.endTime
    ) {
      this.errorMsg = 'Bitte alle Pflichtfelder ausfüllen.';
      return;
    }

    this.loading = true;

    try {
      const dateString = this.date
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD

      await addDoc(collection(this.fs, 'tours'), {
        name: this.name.trim(),
        company: this.company.trim(),
        person: this.person.trim(),
        date: dateString,
        startTime: this.startTime,
        endTime: this.endTime,
        note: this.note.trim() || null,
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

  close() {
    this.dialogRef.close();
  }
}