import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { combineLatest, map, Observable, shareReplay } from 'rxjs';

type TourDoc = {
  id: string;
  name: string;
  company?: string;
  person: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note?: string | null;
  confirmedTruckIds?: string[];
};

type TruckDoc = {
  id: string;
  name?: string;
  maxWeight?: number;
  area?: number;
  length?: number;
  width?: number;
};

export type MiniPoint = { label: string; value: number };

export type NextTour = {
  id: string;
  title: string;
  when: Date;
  company?: string;
  person: string;
};

export interface TruckUsageDay {
  date: Date;
  used: number;
  total: number;
}

export type DashboardStats = {
  mini7days: MiniPoint[];
  nextTour: NextTour | null;
  weekCount: number;

  todayTours: TourDoc[];
  monthTours: TourDoc[];

  trucksTotal: number;
  trucksUsedToday: number;
  trucksUsedMonth: number;

  trucksNext7Days: TruckUsageDay[];
  trucksMonthDays: TruckUsageDay[];
};

@Injectable({ providedIn: 'root' })
export class DashboardStatsService {
  private fs = inject(Firestore);

  private tours$ = (
    collectionData(collection(this.fs, 'tours'), {
      idField: 'id',
    }) as Observable<TourDoc[]>
  ).pipe(shareReplay(1));

  private trucks$ = (
    collectionData(collection(this.fs, 'trucks'), {
      idField: 'id',
    }) as Observable<TruckDoc[]>
  ).pipe(shareReplay(1));

  stats$(): Observable<DashboardStats> {
    return combineLatest([this.tours$, this.trucks$]).pipe(
      map(([tours, trucks]) => {
        const now = new Date();
        const todayYmd = this.toYmd(now);
        const monthKey = todayYmd.slice(0, 7); // YYYY-MM

        const parsed = tours
          .map((t) => ({
            ...t,
            _start: this.toLocalDateTime(t.date, t.startTime),
          }))
          .filter((t) => !Number.isNaN(t._start.getTime()))
          .sort((a, b) => a._start.getTime() - b._start.getTime());

        const todayTours = parsed
          .filter((t) => t.date === todayYmd)
          .map(({ _start, ...rest }) => rest as TourDoc);
        const monthTours = parsed
          .filter((t) => t.date?.startsWith(monthKey))
          .map(({ _start, ...rest }) => rest as TourDoc);

        const next = parsed.find((t) => t._start.getTime() >= now.getTime());
        const nextTour: NextTour | null = next
          ? {
              id: next.id,
              title: next.name,
              when: next._start,
              company: next.company,
              person: next.person,
            }
          : null;

        const { weekStart, weekEnd } = this.weekBounds(now);
        const weekCount = parsed.filter(
          (t) => t._start >= weekStart && t._start < weekEnd
        ).length;

        const mini7days = this.last7DaysCounts(parsed, now);

        const trucksTotal = trucks.length;

        const trucksUsedToday = this.countUniqueTruckIds(
          tours.filter((t) => t.date === todayYmd)
        );
        const trucksUsedMonth = this.countUniqueTruckIds(
          tours.filter((t) => t.date?.startsWith(monthKey))
        );
        const trucksNext7Days = this.truckUsageNextDays(
          tours,
          trucksTotal,
          now,
          7
        );
        const trucksMonthDays = this.truckUsageMonth(tours, trucksTotal, now);

        return {
          mini7days,
          nextTour,
          weekCount,
          todayTours,
          monthTours,
          trucksTotal,
          trucksUsedToday,
          trucksUsedMonth,
          trucksNext7Days,
          trucksMonthDays,
        };
      }),
      shareReplay(1)
    );
  }

  // -------- helpers --------

  private toLocalDateTime(dateYmd: string, timeHm: string): Date {
    return new Date(`${dateYmd}T${timeHm}:00`);
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private weekBounds(now: Date) {
    // Montag 00:00 -> nächste Montag 00:00
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=So,1=Mo...
    const diffToMon = (day + 6) % 7;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - diffToMon);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return { weekStart, weekEnd };
  }

  private last7DaysCounts(parsed: any[], now: Date): MiniPoint[] {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);

    const points: MiniPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const ymd = this.toYmd(d);
      const label = ymd.slice(5); // MM-DD
      const value = parsed.filter((t) => t.date === ymd).length;
      points.push({ label, value });
    }
    return points;
  }

  private countUniqueTruckIds(tours: TourDoc[]): number {
    const set = new Set<string>();
    for (const t of tours) {
      for (const id of t.confirmedTruckIds ?? []) set.add(id);
    }
    return set.size;
  }

  private truckUsageForDate(tours: TourDoc[], ymd: string): number {
    // zählt eindeutige confirmedTruckIds für diesen Tag
    const set = new Set<string>();
    for (const t of tours) {
      if (t.date !== ymd) continue;
      for (const id of t.confirmedTruckIds ?? []) set.add(id);
    }
    return set.size;
  }

  private truckUsageNextDays(
    tours: TourDoc[],
    trucksTotal: number,
    now: Date,
    days: number
  ): TruckUsageDay[] {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);

    const out: TruckUsageDay[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const ymd = this.toYmd(d);

      out.push({
        date: d,
        used: this.truckUsageForDate(tours, ymd),
        total: trucksTotal,
      });
    }
    return out;
  }

  private truckUsageMonth(
    tours: TourDoc[],
    trucksTotal: number,
    now: Date
  ): TruckUsageDay[] {
    const y = now.getFullYear();
    const m = now.getMonth(); // 0..11

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0); // letzter Tag im Monat
    const daysInMonth = last.getDate();

    const out: TruckUsageDay[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      const ymd = this.toYmd(d);

      out.push({
        date: d,
        used: this.truckUsageForDate(tours, ymd),
        total: trucksTotal,
      });
    }
    return out;
  }
}
