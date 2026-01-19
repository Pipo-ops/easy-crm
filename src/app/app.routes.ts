import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CompanyComponent } from './company/company.component';
import { CompanyDetailComponent } from './company-detail/company-detail.component';
import { CatagoryComponent } from './catagory/catagory.component';
import { ArticalComponent } from './artical/artical.component';
import { LkwComponent } from './lkw/lkw.component';
import { TruckRoutesComponent } from './truck-routes/truck-routes.component';
import { TourDetailComponent } from './tour-detail/tour-detail.component';
import { UserComponent } from './user/user.component';
import { UserDetailComponent } from './user-detail/user-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { title: 'Dashboard' },
  },
  { path: 'company', component: CompanyComponent, data: { title: 'Kunden' } },
  {
    path: 'company-detail/:id',
    component: CompanyDetailComponent,
    data: { title: 'Kunden Details' },
  },
  { path: 'user', component: UserComponent, data: { title: 'User' } },
  {
    path: 'user-detail/:id',
    component: UserDetailComponent,
    data: { title: 'User Details' },
  },
  {
    path: 'category',
    component: CatagoryComponent,
    data: { title: 'Artikel verwalten' },
  },
  {
    path: 'category/:id',
    component: ArticalComponent,
    data: { title: 'Artikel' },
  },

  { path: 'lkw', component: LkwComponent, data: { title: 'LKW verwalten' } },
  {
    path: 'truck-routes',
    component: TruckRoutesComponent,
    data: { title: 'LKW Routen verwalten' },
  },

  {
    path: 'tour/:id',
    component: TourDetailComponent,
    data: { title: 'Tour Detail' },
  },
];
