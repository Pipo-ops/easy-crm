import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { Company } from '../../models/company.class';
import { User } from '../../models/user.class';

type TourData = {
  id: string;
  name: string;
  company: string;
  companyId?: string | null;
  user: string;
  userId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  note?: string | null;
};

@Component({
  selector: 'app-dialog-edit-tour',
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
    MatAutocompleteModule,
  ],
  templateUrl: './dialog-edit-tour.component.html',
  styleUrl: './dialog-edit-tour.component.scss',
})
export class DialogEditTourComponent {
  private fs = inject(Firestore);

  constructor(
    private dialogRef: MatDialogRef<DialogEditTourComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TourData
  ) {
    // Felder vorbefüllen
    this.name = data.name ?? '';
    this.note = data.note ?? '';
    this.startTime = data.startTime ?? '';
    this.endTime = data.endTime ?? '';

    // Datum (string -> Date)
    this.date = this.parseDateString(data.date);

    // companyInput: zunächst als string, später wenn wir company matchen als Objekt setzen
    this.companyInput = data.company ?? '';
  }

  name = '';
  date: Date | null = null;
  startTime = '';
  endTime = '';
  note = '';

  loading = false;
  errorMsg = '';

  companies$!: Observable<Company[]>;
  users$!: Observable<User[]>;

  selectedCompany: Company | null = null;
  selectedUser: User | null = null;

  companyInput: string | Company = '';
  filteredCompanies: Company[] = [];
  allCompanies: Company[] = [];

  ngOnInit() {
    const companyRef = collection(this.fs, 'companies');
    this.companies$ = collectionData(companyRef, { idField: 'id' }) as Observable<Company[]>;

    this.companies$.subscribe((list) => {
      this.allCompanies = list;
      this.filteredCompanies = list;

      // companyId matchen (wenn vorhanden)
      if (this.data.companyId) {
        const found = list.find((c) => c.id === this.data.companyId);
        if (found) {
          this.selectedCompany = found;
          this.companyInput = found;
        }
      } else {
        // sonst per Name matchen
        const byName = list.find((c) => (c.company ?? '') === (this.data.company ?? ''));
        if (byName) {
          this.selectedCompany = byName;
          this.companyInput = byName;
        }
      }
    });

    const usersRef = collection(this.fs, 'users');
    this.users$ = collectionData(usersRef, { idField: 'id' }) as Observable<User[]>;

    // userId matchen sobald users geladen
    this.users$.subscribe((users) => {
      const found = users.find((u) => u.id === this.data.userId);
      if (found) this.selectedUser = found;
    });
  }

  // ---- Company Autocomplete ----

  displayCompany = (c: Company | string | null) => {
    if (!c) return '';
    return typeof c === 'string' ? c : c.company;
  };

  onCompanySelected(c: Company) {
    this.selectedCompany = c;
    this.companyInput = c;
  }

  onCompanyInputChange() {
    const q =
      typeof this.companyInput === 'string'
        ? this.companyInput.toLowerCase().trim()
        : (this.companyInput.company ?? '').toLowerCase().trim();

    this.filteredCompanies = this.allCompanies.filter(
      (c) =>
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.firstName ?? '').toLowerCase().includes(q) ||
        (c.lastName ?? '').toLowerCase().includes(q)
    );

    if (typeof this.companyInput === 'string') {
      this.selectedCompany = null;
    }
  }

  // ---- User compare ----
  compareUser = (a: User | null, b: User | null) => (a && b ? a.id === b.id : a === b);

  // ---- Save ----
  async save() {
    this.errorMsg = '';

    const typedCompany =
      typeof this.companyInput === 'string' ? this.companyInput.trim() : '';

    const chosenCompany =
      typeof this.companyInput !== 'string'
        ? this.companyInput
        : this.selectedCompany;

    if (
      !this.name.trim() ||
      (!chosenCompany && !typedCompany) ||
      !this.selectedUser ||
      !this.date ||
      !this.startTime ||
      !this.endTime
    ) {
      this.errorMsg = 'Bitte alle Felder ausfüllen.';
      return;
    }

    this.loading = true;

    try {
      const d = this.date;
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      await updateDoc(doc(this.fs, 'tours', this.data.id), {
        name: this.name.trim(),

        companyId: chosenCompany?.id ?? null,
        company: chosenCompany?.company ?? typedCompany,

        userId: this.selectedUser.id,
        user: `${this.selectedUser.firstName} ${this.selectedUser.lastName}`,

        date: dateString,
        startTime: this.startTime,
        endTime: this.endTime,
        note: this.note.trim() || null,

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

  close() {
    this.dialogRef.close();
  }

  private parseDateString(s: string | undefined | null): Date | null {
    if (!s) return null;
    // erwartet YYYY-MM-DD
    const parts = s.split('-').map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d);
  }
}