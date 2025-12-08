import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type Box = {
  id: string;
  articleName: string;
  pieces: number;
  area: number;   // m²
  weight: number; // kg
};

@Component({
  selector: 'app-dialog-edit-box',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './dialog-edit-box.component.html',
  styleUrl: './dialog-edit-box.component.scss'
})
export class DialogEditBoxComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogEditBoxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Box
  ) {}

  close() {
    this.dialogRef.close();
  }

  deleteBox() {
    this.dialogRef.close({ delete: true, id: this.data.id });
  }
}
