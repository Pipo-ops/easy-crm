import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import {
  combineLatest,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';

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
  trucksUsedToday: number; // used = confirmed (unique)
  trucksUsedMonth: number; // used = confirmed (unique)

  trucksNext7Days: TruckUsageDay[];
  trucksMonthDays: TruckUsageDay[];

  monthCount: number;
  avgTruckUtilPctMonth: number; // 0..100
  avgTourDurationMinMonth: number; // Minuten
};

@Injectable({ providedIn: 'root' })
export class DashboardStatsService {
  private fs = inject(Firestore);

  private tours$ = (
    collectionData(collection(this.fs, 'tours'), { idField: 'id' }) as Observable<
      TourDoc[]
    >
  ).pipe(shareReplay(1));

  private trucks$ = (
    collectionData(collection(this.fs, 'trucks'), { idField: 'id' }) as Observable<
      TruckDoc[]
    >
  ).pipe(shareReplay(1));

  // Subcollection: tours/{tourId}/extraTrucks -> Anzahl
  private extraTruckCountForTour$(tourId: string): Observable<number> {
    const ref = collection(this.fs, `tours/${tourId}/extraTrucks`);
    return (collectionData(ref, { idField: 'id' }) as Observable<any[]>).pipe(
      map((list) => list.length)
    );
  }

  stats$(): Observable<DashboardStats> {
    return combineLatest([this.tours$, this.trucks$]).pipe(
      switchMap(([tours, trucks]) => {
        const tourIds = [...new Set(tours.map((t) => t.id).filter(Boolean))];

        const extra$ = tourIds.length
          ? combineLatest(
              tourIds.map((id) =>
                this.extraTruckCountForTour$(id).pipe(
                  map((count) => ({ id, count }))
                )
              )
            )
          : of([] as { id: string; count: number }[]);

        return extra$.pipe(
          map((list) => {
            const extraCountMap = new Map<string, number>();
            for (const x of list) extraCountMap.set(x.id, x.count);

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

            const trucksTotal = trucks.length;

            // NextTour
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

            // Week count
            const { weekStart, weekEnd } = this.weekBounds(now);
            const weekCount = parsed.filter(
              (t) => t._start >= weekStart && t._start < weekEnd
            ).length;

            // Mini 7 days
            const mini7days = this.last7DaysCounts(parsed, now);

            // ✅ Heute/Monat: used = unique confirmedTruckIds
            const trucksUsedToday = this.trucksUsedUniqueOnDay(tours, todayYmd);
            const trucksUsedMonth = this.trucksUsedUniqueInMonth(tours, monthKey);

            // ✅ Panel: pro Tag used/total (total inkl. Extra-LKWs dieses Tages)
            const trucksNext7Days = this.truckUsageNextDays(
              tours,
              trucksTotal,
              now,
              7,
              extraCountMap
            );

            const trucksMonthDays = this.truckUsageMonthDays(
              tours,
              trucksTotal,
              now,
              extraCountMap
            );

            const monthCount = monthTours.length;

            // Ø Auslastung im Monat (%): used = confirmedTruckIds.length, total = base + extra (pro Tour)
            const avgTruckUtilPctMonth = this.avgTruckUtilPctForTours(
              monthTours,
              trucksTotal,
              extraCountMap
            );

            const avgTourDurationMinMonth = this.avgTourDurationMin(monthTours);

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
              monthCount,
              avgTruckUtilPctMonth,
              avgTourDurationMinMonth,
            };
          })
        );
      }),
      shareReplay(1)
    );
  }

  // ---------------- helpers ----------------

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

  // ✅ used = unique confirmedTruckIds (pro Tag)
  private trucksUsedUniqueOnDay(tours: TourDoc[], ymd: string): number {
    const set = new Set<string>();
    for (const t of tours) {
      if (t.date !== ymd) continue;
      for (const id of t.confirmedTruckIds ?? []) set.add(id);
    }
    return set.size;
  }

  // ✅ used = unique confirmedTruckIds (im Monat)
  private trucksUsedUniqueInMonth(tours: TourDoc[], monthKey: string): number {
    const set = new Set<string>();
    for (const t of tours) {
      if (!t.date?.startsWith(monthKey)) continue;
      for (const id of t.confirmedTruckIds ?? []) set.add(id);
    }
    return set.size;
  }

  // ✅ pro Tag: used/total
  // used = unique confirmedTruckIds
  // total = trucksTotal + extras (von allen Touren an dem Tag)
  private truckUsageForDate(
    tours: TourDoc[],
    ymd: string,
    trucksTotal: number,
    extraCountMap: Map<string, number>
  ): { used: number; total: number } {
    const dayTours = tours.filter((t) => t.date === ymd);

    const usedSet = new Set<string>();
    for (const t of dayTours) {
      for (const id of t.confirmedTruckIds ?? []) usedSet.add(id);
    }

    let extraTotal = 0;
    for (const t of dayTours) extraTotal += extraCountMap.get(t.id) ?? 0;

    return {
      used: usedSet.size,
      total: trucksTotal + extraTotal,
    };
  }

  private truckUsageNextDays(
    tours: TourDoc[],
    trucksTotal: number,
    now: Date,
    days: number,
    extraCountMap: Map<string, number>
  ): TruckUsageDay[] {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);

    const out: TruckUsageDay[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const ymd = this.toYmd(d);

      const r = this.truckUsageForDate(tours, ymd, trucksTotal, extraCountMap);
      out.push({ date: d, used: r.used, total: r.total });
    }
    return out;
  }

  private truckUsageMonthDays(
    tours: TourDoc[],
    trucksTotal: number,
    now: Date,
    extraCountMap: Map<string, number>
  ): TruckUsageDay[] {
    const y = now.getFullYear();
    const m = now.getMonth();
    const last = new Date(y, m + 1, 0);
    const daysInMonth = last.getDate();

    const out: TruckUsageDay[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      const ymd = this.toYmd(d);

      const r = this.truckUsageForDate(tours, ymd, trucksTotal, extraCountMap);
      out.push({ date: d, used: r.used, total: r.total });
    }
    return out;
  }

  private avgTruckUtilPctForTours(
    tours: TourDoc[],
    trucksTotal: number,
    extraCountMap: Map<string, number>
  ): number {
    if (!tours.length) return 0;

    let sum = 0;

    for (const t of tours) {
      const used = t.confirmedTruckIds?.length ?? 0; // ✅ nur bestätigte
      const total = trucksTotal + (extraCountMap.get(t.id) ?? 0); // ✅ base + extra

      sum += total > 0 ? (used / total) * 100 : 0;
    }

    return Math.round(sum / tours.length);
  }

  private avgTourDurationMin(tours: TourDoc[]): number {
    const minutes = tours
      .map((t) => this.durationMinutes(t.date, t.startTime, t.endTime))
      .filter((m) => Number.isFinite(m) && m > 0);

    if (!minutes.length) return 0;

    const avg = minutes.reduce((a, b) => a + b, 0) / minutes.length;
    return Math.round(avg);
  }

  private durationMinutes(dateYmd: string, startHm: string, endHm: string): number {
    const start = new Date(`${dateYmd}T${startHm}:00`);
    let end = new Date(`${dateYmd}T${endHm}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NaN;

    if (end.getTime() < start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
}
