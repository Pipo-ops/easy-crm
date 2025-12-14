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
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
} from '@angular/fire/firestore';
import { Company } from '../../models/company.class';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';

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
    MatSelectModule,
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
  date: Date | null = null; 
  startTime = '';
  endTime = '';
  note = '';

  loading = false;
  errorMsg = '';

  companies$!: Observable<Company[]>;
  selectedCompany: Company | null = null;

  ngOnInit() {
    const companyRef = collection(this.fs, 'companies');
    this.companies$ = collectionData(companyRef, {
      idField: 'id',
    }) as Observable<Company[]>;
  }

  // für mat-select (Objekte vergleichen)
  compareCompany = (a: Company | null, b: Company | null) =>
    a && b ? a.id === b.id : a === b;

  async save() {
    this.errorMsg = '';

    if (
      !this.name.trim() ||
      !this.selectedCompany || 
      !this.person.trim() ||
      !this.date ||
      !this.startTime ||
      !this.endTime
    ) {
      this.errorMsg = 'Bitte alle Felder ausfüllen.';
      return;
    }

    this.loading = true;

    try {
      const dateString = this.date.toISOString().split('T')[0]; // YYYY-MM-DD

      await addDoc(collection(this.fs, 'tours'), {
        name: this.name.trim(),
        companyId: this.selectedCompany.id,    
        company: this.selectedCompany.company, 
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
