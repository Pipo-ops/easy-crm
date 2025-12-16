import { Injectable } from '@angular/core';
import { Box, Truck } from '../../models/tour.models';

@Injectable({ providedIn: 'root' })
export class TourDetailPrintService {
  printConfirmedTrucks(
    confirmedTrucks: Truck[],
    boxes: Box[],
    helpers: {
      boxesForTruck: (t: Truck) => Box[];
      truckCapacityArea: (t: Truck) => number;
      truckCapacityWeight: (t: Truck) => number;
      truckLoadedArea: (t: Truck) => number;
      truckLoadedWeight: (t: Truck) => number;
      isTruckOverloaded: (t: Truck) => boolean;
    },
    title = 'Tour Übersicht'
  ) {
    if (!confirmedTrucks.length) {
      alert('Bitte zuerst LKW Auswahl übernehmen.');
      return;
    }

    const html = this.buildHtml(
      title,
      confirmedTrucks,
      boxes,
      helpers
    );

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      alert('Pop-up blockiert. Bitte Pop-ups erlauben.');
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();

    w.onload = () => {
      w.focus();
      w.print();
      // w.close(); // optional
    };
  }

  // --------------------------------------------------

  private buildHtml(
    title: string,
    confirmedTrucks: Truck[],
    boxes: Box[],
    helpers: any
  ): string {
    const escape = (s: any) =>
      String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const dateStr = new Date().toLocaleString('de-AT');

    const sections = confirmedTrucks
      .map((t) => {
        const truckBoxes = helpers.boxesForTruck(t);

        const capA = helpers.truckCapacityArea(t);
        const capW = helpers.truckCapacityWeight(t);
        const loadA = helpers.truckLoadedArea(t);
        const loadW = helpers.truckLoadedWeight(t);
        const overloaded = helpers.isTruckOverloaded(t);

        const rows =
          truckBoxes.length === 0
            ? `<tr><td colspan="4" class="muted">Keine Kisten zugeordnet</td></tr>`
            : truckBoxes
                .map(
                  (b: Box) => `
          <tr>
            <td>${escape(b.articleName)}</td>
            <td class="num">${escape(b.pieces)}</td>
            <td class="num">${escape(b.area?.toFixed?.(2))} m²</td>
            <td class="num">${escape(b.weight?.toFixed?.(2))} kg</td>
          </tr>`
                )
                .join('');

        return `
        <section class="truck ${overloaded ? 'bad' : ''}">
          <h2>${escape(t.name ?? 'LKW')}</h2>

          <div class="meta">
            <div><b>Kapazität:</b> ${capA.toFixed(2)} m² · ${capW.toFixed(0)} kg</div>
            <div><b>Beladen:</b> ${loadA.toFixed(2)} m² · ${loadW.toFixed(0)} kg</div>
            <div><b>Status:</b>
              ${overloaded
                ? '<span class="badTxt">ÜBERLADEN</span>'
                : '<span class="okTxt">OK</span>'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Artikel</th>
                <th class="num">Stk</th>
                <th class="num">Fläche</th>
                <th class="num">Gewicht</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
        `;
      })
      .join('');

    return `
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escape(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    .muted { color:#666; }
    .truck { border:1px solid #ddd; border-radius:10px; padding:14px; margin-bottom:14px; }
    .truck.bad { border-color:#c62828; }
    h2 { margin:0 0 8px; font-size:16px; }
    .meta { display:flex; flex-wrap:wrap; gap:10px 18px; font-size:13px; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:8px 6px; border-top:1px solid #eee; font-size:13px; }
    th { background:#fafafa; text-align:left; }
    .num { text-align:right; }
    .okTxt { color:#2e7d32; font-weight:700; }
    .badTxt { color:#c62828; font-weight:700; }

    @media print {
      .truck { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escape(title)}</h1>
  <div class="muted">Gedruckt am: ${escape(dateStr)}</div>

  ${sections}
</body>
</html>
`;
  }
}
