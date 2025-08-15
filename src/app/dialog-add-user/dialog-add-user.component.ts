import { Component } from '@angular/core';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { User } from '../../models/user.class';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';

@Component({
  selector: 'app-dialog-add-user',
  standalone: true,
  imports: [
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
  ],
  templateUrl: './dialog-add-user.component.html',
  styleUrl: './dialog-add-user.component.scss'
})
export class DialogAddUserComponent {

  firestore: Firestore = inject(Firestore);

  user = new User();
  birthDate: Date;
  

  constructor(public dialog: MatDialog) {
    this.birthDate = new Date();
  }

  onNoClick(): void {
    
  }

  async saveUser() {
  this.user.birthDate = this.birthDate.getTime();

  try {
    const userCollection = collection(this.firestore, 'users');
    await addDoc(userCollection, { ...this.user });
    console.log('User gespeichert:', this.user);
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
}
}
