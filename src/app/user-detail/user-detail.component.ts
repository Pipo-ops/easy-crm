import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Firestore, getDoc } from '@angular/fire/firestore';
import { deleteDoc, doc } from '@angular/fire/firestore';
import { User } from '../../models/user.class';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditUserComponent } from '../dialog-edit-user/dialog-edit-user.component';
import { DialogEditAddressComponent } from '../dialog-edit-address/dialog-edit-address.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  user: User = new User();
  userId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    public dialog: MatDialog,
    private router: Router
  ) {}

  async ngOnInit() {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userId = paramMap.get('id');
      if (this.userId) {
        let userDocRef = doc(this.firestore, `users/${this.userId}`);
        let userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          this.user = userSnap.data() as User;
        } else {
          console.error('User not found!');
        }
      }
    });
  }

  editUserDetail() {
    const dialogRef = this.dialog.open<DialogEditUserComponent>(
      DialogEditUserComponent
    );
    dialogRef.componentInstance.user = this.user;
    dialogRef.componentInstance.userId = this.userId!;
  }

  async deleteUserDetail() {
    if (!this.userId) return;

    const userDocRef = doc(this.firestore, `users/${this.userId}`);
    await deleteDoc(userDocRef);

    this.router.navigate(['/user']);
  }

  editAddressMenu() {
    const dialogRef = this.dialog.open<DialogEditAddressComponent>(
      DialogEditAddressComponent
    );
    dialogRef.componentInstance.user = this.user;
    dialogRef.componentInstance.userId = this.userId!;
  }
}
