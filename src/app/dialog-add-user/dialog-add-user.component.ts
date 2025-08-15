import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { User } from '../../models/user.class';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';

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
  templateUrl: './dialog-add-user.component.html',
  styleUrl: './dialog-add-user.component.scss',
})
export class DialogAddUserComponent {
  firestore: Firestore = inject(Firestore);

  user = new User();
  birthDate: Date;
  loading = false;

  constructor(public dialog: MatDialog) {
    this.birthDate = new Date();
  }

  onNoClick(): void {}

  async saveUser() {
    this.user.birthDate = this.birthDate.getTime();
    this.loading = true;

    try {
      const userCollection = collection(this.firestore, 'users');
      await addDoc(userCollection, { ...this.user });
      console.log('User saved');
    } catch (error) {
      console.error('Error adding user: ', error);
    } finally {
      this.loading = false;

      this.user = new User();
      this.birthDate = new Date();
    }
  }
}
