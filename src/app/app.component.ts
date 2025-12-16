import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterModule,
  RouterOutlet,
  Router,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LayoutService } from './services/layout.service';

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
    MatButtonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private layout = inject(LayoutService);

  pageTitle = 'Dashboard';

  sidenavOpened$ = this.layout.sidenavOpened$;
  
  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle = this.getDeepestTitle(this.route) || 'Dashboard';
      });

    // falls du beim ersten Laden sofort den Titel willst:
    this.pageTitle = this.getDeepestTitle(this.route) || 'Dashboard';
  }

  private getDeepestTitle(route: ActivatedRoute): string | null {
    let r: ActivatedRoute | null = route;
    while (r?.firstChild) r = r.firstChild;
    return (r?.snapshot.data?.['title'] as string) ?? null;
  }
}
