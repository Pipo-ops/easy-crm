import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
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
  templateUrl: './dialog-edit-user.component.html',
  styleUrl: './dialog-edit-user.component.scss',
})
export class DialogEditUserComponent implements OnInit {
  user!: User;
  userId!: string;
  birthDate: Date = new Date();
  loading = false;

  firestore = inject(Firestore);

  constructor(public dialogRef: MatDialogRef<DialogEditUserComponent>) {}

  ngOnInit() {
    if (this.user.birthDate) {
      this.birthDate = new Date(this.user.birthDate);
    }
  }

  async saveUser() {
    this.loading = true;
    this.user.firstName = this.capitalize(this.user.firstName);
    this.user.lastName = this.capitalize(this.user.lastName);
    this.user.birthDate = this.birthDate.getTime();

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
