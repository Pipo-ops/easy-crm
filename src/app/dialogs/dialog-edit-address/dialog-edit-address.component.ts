import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user.class';
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

  user!: User;
  userId!: string;
  loading = false;

  firestore = inject(Firestore);


  constructor(public dialogRef: MatDialogRef<DialogEditAddressComponent>) {}

  async saveUser() {
    this.loading = true;

    this.user.street = this.capitalize(this.user.street);
    this.user.city = this.capitalize(this.user.city);

    try {
      const userRef = doc(this.firestore, 'users', this.userId);
      await setDoc(userRef, { ...this.user });

      console.log('User updated');
      this.dialogRef.close();
    } catch (error) {
      console.error('Error updating user: ', error);
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
