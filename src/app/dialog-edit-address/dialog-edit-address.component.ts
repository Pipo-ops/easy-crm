import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';


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
  loading = false;

  constructor(public dialogRef: MatDialogRef<DialogEditAddressComponent>) {}

  saveUser() {}

  closeDialog() {
    this.dialogRef.close();
  }
}
