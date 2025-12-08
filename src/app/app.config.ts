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
import { provideNativeDateAdapter } from '@angular/material/core';
import { CompanyDetailComponent } from './company-detail/company-detail.component';
import { CatagoryComponent } from './catagory/catagory.component';
import { TruckRoutesComponent } from './truck-routes/truck-routes.component';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { ArticalComponent } from './artical/artical.component';
import { LkwComponent } from './lkw/lkw.component';
import { TourDetailComponent } from './tour-detail/tour-detail.component';
import { CompanyComponent } from './company/company.component';

export const appConfig: ApplicationConfig = {
  
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()), 

    provideRouter([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'company', component: CompanyComponent },
      { path: 'company-detail/:id', component: CompanyDetailComponent },
      { path: 'category', component: CatagoryComponent },
      { path: 'category/:id', component: ArticalComponent }, 
      { path: 'lkw', component: LkwComponent },
      { path: 'truck-routes', component: TruckRoutesComponent },
      { path: 'tour/:id', component: TourDetailComponent },
    ]),
    
    provideClientHydration(),
    provideAnimationsAsync(),
    MatToolbarModule,
    MatSidenavModule,
    provideNativeDateAdapter(),
  ],
};
