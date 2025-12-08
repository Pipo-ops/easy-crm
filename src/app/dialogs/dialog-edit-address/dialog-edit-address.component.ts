import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Company } from '../../../models/company.class';
import { doc, setDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';


@Component({
  selector: 'app-dialog-edit-address',
  standalone: true,
  imports: [
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './dialog-edit-address.component.html',
  styleUrl: './dialog-edit-address.component.scss',
})
export class DialogEditAddressComponent {

  company!: Company;
  companyId!: string;
  loading = false;

  firestore = inject(Firestore);


  constructor(public dialogRef: MatDialogRef<DialogEditAddressComponent>) {}

  async saveCompany() {
    this.loading = true;

    this.company.street = this.capitalize(this.company.street);
    this.company.city = this.capitalize(this.company.city);

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
