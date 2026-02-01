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
import { User } from '../../models/user.class';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
    MatAutocompleteModule,
  ],
  templateUrl: './dialog-add-tour.component.html',
  styleUrl: './dialog-add-tour.component.scss',
})
export class DialogAddTourComponent {
  private fs = inject(Firestore);
  constructor(private dialogRef: MatDialogRef<DialogAddTourComponent>) {}

  name = '';
  company = '';
  user = '';
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
    this.companies$ = collectionData(companyRef, {
      idField: 'id',
    }) as Observable<Company[]>;

    this.companies$.subscribe((list) => {
      this.allCompanies = list;
      this.filteredCompanies = list;
    });

    const usersRef = collection(this.fs, 'users');
    this.users$ = collectionData(usersRef, { idField: 'id' }) as Observable<
      User[]
    >;
  }

  displayCompany = (c: Company | string | null) => {
    if (!c) return '';
    return typeof c === 'string' ? c : c.company;
  };

  onCompanySelected(c: Company) {
    this.selectedCompany = c;
    this.companyInput = c; // damit displayWith greift
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
        (c.lastName ?? '').toLowerCase().includes(q),
    );

    // wenn user tippt -> selectedCompany zurücksetzen
    if (typeof this.companyInput === 'string') {
      this.selectedCompany = null;
    }
  }

  compareUser = (a: User | null, b: User | null) =>
    a && b ? a.id === b.id : a === b;

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
      const dateString = `${d.getFullYear()}-${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      await addDoc(collection(this.fs, 'tours'), {
        name: this.name.trim(),

        companyId: chosenCompany?.id ?? null,
        company: chosenCompany?.company ?? typedCompany,

        userId: this.selectedUser.id,
        user: `${this.selectedUser.firstName} ${this.selectedUser.lastName}`,

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
