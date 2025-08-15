import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIconModule} from '@angular/material/icon';
import { UserComponent } from './user/user.component';
import { DashboardComponent } from './dashboard/dashboard.component'
import {MatButtonModule} from '@angular/material/button';
import { Firestore } from '@angular/fire/firestore';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    UserComponent,
    DashboardComponent,
    MatButtonModule,
    AsyncPipe
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  firestore: Firestore = inject(Firestore);

  title = 'easy-crm';
}
