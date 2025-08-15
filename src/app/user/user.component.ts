import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogAddUserComponent } from '../dialog-add-user/dialog-add-user.component';
import { User } from '../../models/user.class'; 
import { FormsModule } from '@angular/forms';
import {MatCardModule} from '@angular/material/card';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    RouterModule, 
    MatButtonModule, 
    MatIconModule,
    MatTooltipModule,  
    MatDialogModule,
    FormsModule,
    MatCardModule,
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
})
export class UserComponent {

  user = new User();

  constructor(public dialog: MatDialog) {

  }

  openDialog() {
    this.dialog.open(DialogAddUserComponent)
  }
}
