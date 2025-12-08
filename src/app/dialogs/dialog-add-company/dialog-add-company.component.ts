import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Company } from '../../../models/company.class';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-add-user',
  standalone: true,
  imports: [
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    MatProgressBarModule,
    CommonModule,
  ],
  templateUrl: './dialog-add-company.component.html',
  styleUrl: './dialog-add-company.component.scss',
})
export class DialogAddCompanyComponent {
  firestore: Firestore = inject(Firestore);

  company = new Company();
  birthDate: Date;
  loading = false;

  constructor(public dialogRef: MatDialogRef<DialogAddCompanyComponent>) {
    this.birthDate = new Date();
  }

  onNoClick(): void {}

  async saveCompany() {
    this.company.birthDate = this.birthDate.getTime();
    this.loading = true;

    this.company.firstName = this.capitalize(this.company.firstName);
    this.company.lastName = this.capitalize(this.company.lastName);
    this.company.street = this.capitalize(this.company.street);
    this.company.city = this.capitalize(this.company.city);

    try {
      const companyCollection = collection(this.firestore, 'companies');
      await addDoc(companyCollection, { ...this.company });
    } catch (error) {
      console.error('Error adding company: ', error);
    } finally {
      this.loading = false;
      this.dialogRef.close();
    }
  }

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
