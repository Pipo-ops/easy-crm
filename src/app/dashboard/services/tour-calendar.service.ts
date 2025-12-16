import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';

export type TourDoc = {
  id: string;
  name: string;
  company?: string;
  companyId?: string;
  person: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  note?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
};

@Injectable({ providedIn: 'root' })
export class TourCalendarService {
  private fs = inject(Firestore);

  getEvents(): Observable<CalendarEvent[]> {
    const ref = collection(this.fs, 'tours');

    return (
      collectionData(ref, { idField: 'id' }) as Observable<TourDoc[]>
    ).pipe(
      map((tours) =>
        tours
          .filter((t) => t.date && t.startTime && t.endTime)
          .map((t) => {
            const start = this.toLocalDateTime(t.date, t.startTime);
            let end = this.toLocalDateTime(t.date, t.endTime);

            // falls Endzeit "vor" Startzeit ist (z.B. über Mitternacht)
            if (end.getTime() <= start.getTime()) {
              end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
            }

            const title = `${t.name} • ${t.company ?? ''} • ${t.person}`
              .replace(/\s•\s$/, '')
              .trim();

            return {
              id: t.id,
              title,
              start,
              end,
            };
          })
      )
    );
  }

  private toLocalDateTime(dateYmd: string, timeHm: string): Date {
    // dateYmd: "2025-12-16", timeHm: "08:30"
    // => lokale Zeit (Europe/Vienna) im Browser
    return new Date(`${dateYmd}T${timeHm}:00`);
  }
}
