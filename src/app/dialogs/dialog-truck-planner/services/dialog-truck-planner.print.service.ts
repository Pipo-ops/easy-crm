import { Injectable } from '@angular/core';

type TruckLike = { id: string; name: string };

type CrateLike = {
  id: string;
  name: string;
  x_m: number;
  y_m: number;
  w_m: number;
  h_m: number;
};

@Injectable({ providedIn: 'root' })
export class DialogTruckPlannerPrintService {
  printPlan(params: {
    title?: string;
    truck: TruckLike;
    truckLength: number;
    truckWidth: number;
    crates: CrateLike[];
    overflowCrates: Pick<CrateLike, 'id' | 'name' | 'w_m' | 'h_m'>[];
    canvas2d: HTMLCanvasElement;
    canvas3d?: HTMLCanvasElement; // optional
    include3d?: boolean; // optional
  }) {
    const {
      title = 'LKW Ladeflächen Planer',
      truck,
      truckLength,
      truckWidth,
      crates,
      overflowCrates,
      canvas2d,
      canvas3d,
      include3d = false,
    } = params;

    const img2d = this.safeCanvasToDataUrl(canvas2d);
    if (!img2d) {
      alert('2D Screenshot konnte nicht erstellt werden.');
      return;
    }

    const img3d =
      include3d && canvas3d ? this.safeCanvasToDataUrl(canvas3d) : null;

    const html = this.buildHtml({
      title,
      truck,
      truckLength,
      truckWidth,
      crates,
      overflowCrates,
      img2d,
      img3d,
    });

    const w = window.open('', '_blank', 'width=980,height=760');
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

  // ---------------- private helpers ----------------

  private safeCanvasToDataUrl(canvas: HTMLCanvasElement): string | null {
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  private buildHtml(input: {
    title: string;
    truck: TruckLike;
    truckLength: number;
    truckWidth: number;
    crates: CrateLike[];
    overflowCrates: Pick<CrateLike, 'id' | 'name' | 'w_m' | 'h_m'>[];
    img2d: string;
    img3d: string | null;
  }): string {
    const escape = (s: any) =>
      String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const dateStr = new Date().toLocaleString('de-AT');
    const placed = input.crates.length;
    const overflow = input.overflowCrates.length;

    const rowsPlaced = input.crates
      .map(
        (c) => `
        <tr>
          <td>${escape(c.name)}</td>
          <td class="num">${c.x_m.toFixed(2)}</td>
          <td class="num">${c.y_m.toFixed(2)}</td>
          <td class="num">${c.w_m.toFixed(2)}</td>
          <td class="num">${c.h_m.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const rowsOverflow = input.overflowCrates
      .map(
        (c) => `
        <tr>
          <td>${escape(c.name)}</td>
          <td class="num">${c.w_m.toFixed(2)}</td>
          <td class="num">${c.h_m.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    return `
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escape(input.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    h1 { margin: 0 0 6px; font-size: 18px; }
    .muted { color:#666; font-size: 12px; }
    .meta { margin: 10px 0 14px; display:flex; flex-wrap:wrap; gap: 10px 18px; font-size: 13px; }
    .img-wrap { border: 1px solid #ddd; border-radius: 10px; padding: 10px; margin-top: 12px; }
    img { width: 100%; height: auto; display: block; }
    .grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border-top: 1px solid #eee; padding: 8px 6px; font-size: 12px; }
    th { text-align: left; background: #fafafa; border-top: 1px solid #ddd; }
    .num { text-align: right; white-space: nowrap; }
    h2 { margin: 18px 0 8px; font-size: 14px; }

    @media print {
      body { margin: 10mm; }
      .img-wrap { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escape(input.title)} – ${escape(input.truck.name ?? 'LKW')}</h1>
  <div class="muted">Gedruckt am: ${escape(dateStr)}</div>

  <div class="meta">
    <div><b>Ladefläche:</b> ${input.truckLength.toFixed(2)} m × ${input.truckWidth.toFixed(2)} m</div>
    <div><b>Platziert:</b> ${placed}</div>
    <div><b>Nicht platziert:</b> ${overflow}</div>
  </div>

  <div class="grid">
    <div class="img-wrap">
      <div class="muted" style="margin-bottom:8px;">2D Draufsicht (Screenshot)</div>
      <img src="${input.img2d}" alt="2D Plan" />
    </div>

    ${
      input.img3d
        ? `
    <div class="img-wrap">
      <div class="muted" style="margin-bottom:8px;">3D Ansicht (Screenshot)</div>
      <img src="${input.img3d}" alt="3D Plan" />
    </div>
    `
        : ''
    }
  </div>

  <h2>Platzierte Kisten</h2>
  <table>
    <thead>
      <tr>
        <th>Kiste</th>
        <th class="num">x</th>
        <th class="num">y</th>
        <th class="num">w</th>
        <th class="num">h</th>
      </tr>
    </thead>
    <tbody>
      ${rowsPlaced || `<tr><td colspan="5" class="muted">Keine platzierten Kisten</td></tr>`}
    </tbody>
  </table>

  ${
    input.overflowCrates.length
      ? `
  <h2>Nicht platzierte Kisten</h2>
  <table>
    <thead>
      <tr>
        <th>Kiste</th>
        <th class="num">w</th>
        <th class="num">h</th>
      </tr>
    </thead>
    <tbody>
      ${rowsOverflow}
    </tbody>
  </table>
  `
      : ''
  }
</body>
</html>
    `;
  }
}
