import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Company } from '../../models/company.class';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { doc, setDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-dialog-edit-user',
  standalone: true,
  imports: [
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    CommonModule,
    FormsModule,
    MatDatepickerModule,
  ],
  templateUrl: './dialog-edit-company.component.html',
  styleUrl: './dialog-edit-company.component.scss',
})
export class DialogEditCompanyComponent implements OnInit {
  company!: Company;
  companyId!: string;
  birthDate: Date = new Date();
  loading = false;

  firestore = inject(Firestore);

  constructor(public dialogRef: MatDialogRef<DialogEditCompanyComponent>) {}

  ngOnInit() {
    if (this.company.birthDate) {
      this.birthDate = new Date(this.company.birthDate);
    }
  }

  async saveCompany() {
    this.loading = true;
    this.company.firstName = this.capitalize(this.company.firstName);
    this.company.lastName = this.capitalize(this.company.lastName);
    this.company.birthDate = this.birthDate.getTime();

    try {
      const companyRef = doc(this.firestore, 'companies', this.companyId);
      await setDoc(companyRef, { ...this.company });

      console.log('Company updated');
      this.dialogRef.close();
    } catch (error) {
      console.error('Error updating company: ', error);
    } finally {
      this.loading = false;
    }
  }

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
