import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterModule,
  Router,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { filter } from 'rxjs/operators';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LayoutService } from '../../services/layout.service';
import { signOut } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private layout = inject(LayoutService);
  private auth = inject(Auth);

  pageTitle = 'Dashboard';
  sidenavOpened$ = this.layout.sidenavOpened$;

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle = this.getDeepestTitle(this.route) || 'Dashboard';
      });
  }

  private getDeepestTitle(route: ActivatedRoute): string | null {
    let r: ActivatedRoute | null = route;
    while (r?.firstChild) r = r.firstChild;

    // WICHTIG: snapshot auch optional machen
    return (r?.snapshot?.data?.['title'] as string) ?? null;
  }

  async logout() {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }
}
