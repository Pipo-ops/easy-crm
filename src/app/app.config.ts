import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { firebaseConfig } from '../environments/firebase.config';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UserComponent } from './user/user.component';
import { provideNativeDateAdapter } from '@angular/material/core';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { ArtikelComponent } from './artikel/artikel.component';
import { TruckRoutesComponent } from './truck-routes/truck-routes.component';
import { provideDatabase, getDatabase } from '@angular/fire/database';

export const appConfig: ApplicationConfig = {
  
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()), 

    provideRouter([
      { path: '', component: DashboardComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'user', component: UserComponent },
      { path: 'user-detail/:id', component: UserDetailComponent },
      { path: 'article', component: ArtikelComponent },
      { path: 'truck-routes', component: TruckRoutesComponent },
  ]),
    provideClientHydration(),
    provideAnimationsAsync(),
    MatToolbarModule,
    MatSidenavModule,
    provideNativeDateAdapter(),
  ],
};
