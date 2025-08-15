import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent {
  
  route = inject(ActivatedRoute);
  firestore = inject(Firestore);

  user$: Observable<User>;

  constructor() {
    const userId = this.route.snapshot.paramMap.get('id')!;
    const userDoc = doc(this.firestore, `users/${userId}`);
    this.user$ = docData(userDoc) as Observable<User>;
  }
}
