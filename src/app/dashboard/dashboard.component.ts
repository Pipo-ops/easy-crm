import {
  Component,
  ViewChild,
  inject,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  FullCalendarModule,
  FullCalendarComponent,
} from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { Router } from '@angular/router';

import { LayoutService } from '../services/layout.service';
import { DashboardStatsService } from './services/dashboard-stats.service';
import { TourCalendarService } from './services/tour-calendar.service';

type Scope = 'today' | 'month';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private toursCal = inject(TourCalendarService);
  private statsService = inject(DashboardStatsService);
  private router = inject(Router);
  private layout = inject(LayoutService);

  @ViewChild('fc') fc!: FullCalendarComponent;

  Math = Math;
  isBrowser = false;
  isCalendarFullscreen = false;
  private prevSidenavState: boolean | null = null;

  // Scope für rechte Panels
  scopeTours: Scope = 'today'; // Heutige Touren -> Monat umschalten
  scopeTrucks: Scope = 'today'; // LKW Auslastung -> Monat umschalten

  stats$ = this.statsService.stats$();

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  calendarOptions: any = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    locale: deLocale,
    firstDay: 1,
    initialView: 'dayGridMonth', // ✅ Start Month

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },

    height: 'auto',
    dayMaxEvents: true,
    dayMaxEventRows: 3,

    eventClick: (info: any) => {
      info.jsEvent.preventDefault();
      const id = info.event.id;
      if (id) this.router.navigate(['/tour', id]);
    },

    eventContent: (arg: any) => {
      const raw = String(arg.event.title ?? '');
      const MAX = 22;
      const text = raw.length > MAX ? raw.slice(0, MAX - 1) + '…' : raw;
      return {
        html: `<div class="fc-evt-text">${this.escapeHtml(text)}</div>`,
      };
    },

    events: [],
  };

  ngOnInit() {
    if (!this.isBrowser) return;

    this.toursCal.getEvents().subscribe((events) => {
      this.calendarOptions = { ...this.calendarOptions, events };
    });
  }

  toggleCalendarFullscreen() {
    if (!this.isBrowser) return;

    this.isCalendarFullscreen = !this.isCalendarFullscreen;

    if (this.isCalendarFullscreen) {
      this.prevSidenavState = this.layout.value;
      this.layout.setSidenav(false);
    } else {
      this.layout.setSidenav(this.prevSidenavState ?? true);
      this.prevSidenavState = null;
    }

    setTimeout(() => this.fc?.getApi()?.updateSize(), 0);
  }

  // ✅ Klick: “Heutige Touren” -> Monat anzeigen + Kalender auf Month
  toggleToursScope() {
    this.scopeTours = this.scopeTours === 'today' ? 'month' : 'today';
    this.goCalendarMonth();
  }

  // ✅ Klick: “LKW-Auslastung” -> Monat anzeigen + Kalender auf Month
  toggleTrucksScope() {
    this.scopeTrucks = this.scopeTrucks === 'today' ? 'month' : 'today';
    this.goCalendarMonth();
  }

  private goCalendarMonth() {
    if (!this.isBrowser) return;
    const api = this.fc?.getApi();
    if (!api) return;
    api.changeView('dayGridMonth');
    // optional: api.today();
  }

  jumpToDate(
    date: Date,
    view: 'dayGridMonth' | 'timeGridDay' | 'timeGridWeek' = 'timeGridDay'
  ) {
    if (!this.isBrowser) return;

    const api = this.fc?.getApi();
    if (!api) return;

    api.gotoDate(date);
    api.changeView(view);

    // nach View-Wechsel Größe korrigieren (hilft bei Grid/Fullscreen)
    setTimeout(() => api.updateSize(), 0);
  }

  private escapeHtml(s: string) {
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  formatMinutesToHm(min: number): string {
    if (!min || min <= 0) return '–';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
