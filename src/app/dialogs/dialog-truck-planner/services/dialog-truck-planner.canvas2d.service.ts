import { Injectable } from '@angular/core';
import { Crate } from '../../../models/truck-planner.types';

@Injectable({ providedIn: 'root' })
export class DialogTruckPlannerCanvas2DService {
  initCanvas(canvas: HTMLCanvasElement, truckLength: number, truckWidth: number, scale: number) {
    canvas.width = Math.max(1, Math.round(truckLength * scale));
    canvas.height = Math.max(1, Math.round(truckWidth * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Context not available');
    return ctx;
  }

  draw(args: {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    crates: Crate[];
    selectedId: string | null;
    truckLength: number;
    truckWidth: number;
    scale: number;
  }) {
    const { ctx, canvas, crates, selectedId, scale } = args;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // border
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const crate of crates) {
      const x = crate.x_m * scale;
      const y = crate.y_m * scale;
      const w = crate.w_m * scale;
      const h = crate.h_m * scale;

      ctx.fillStyle = crate.color;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = selectedId === crate.id ? 4 : 2;

      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      this.drawCrateLabel(ctx, crate.name, crate.color, x, y, w, h);
    }
  }

  getCanvasPoint(canvas: HTMLCanvasElement, ev: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const xRel = ev.clientX - rect.left;
    const yRel = ev.clientY - rect.top;
    const x = xRel * (canvas.width / rect.width);
    const y = yRel * (canvas.height / rect.height);
    return { x, y };
  }

  hitTest(crates: Crate[], px: number, py: number, scale: number): Crate | null {
    for (let i = crates.length - 1; i >= 0; i--) {
      const c = crates[i];
      const x = c.x_m * scale;
      const y = c.y_m * scale;
      const w = c.w_m * scale;
      const h = c.h_m * scale;

      if (px >= x && px <= x + w && py >= y && py <= y + h) return c;
    }
    return null;
  }

  clampToTruck(c: Crate, truckLength: number, truckWidth: number) {
    c.x_m = Math.max(0, Math.min(truckLength - c.w_m, c.x_m));
    c.y_m = Math.max(0, Math.min(truckWidth - c.h_m, c.y_m));
  }

  // -------- labels --------

  private drawCrateLabel(
    ctx: CanvasRenderingContext2D,
    name: string,
    bgColor: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const pad = 4;
    if (w < 16 || h < 12) return;

    let label = '';
    if (w >= 90 && h >= 28) label = this.ellipsize(name, 18);
    else if (w >= 55 && h >= 22) label = this.ellipsize(name, 10);
    else if (w >= 26 && h >= 16) label = this.initials(name, 2);
    else label = this.initials(name, 1);

    const fontSize = h >= 40 ? 14 : h >= 28 ? 12 : h >= 20 ? 10 : 9;
    ctx.font = `600 ${fontSize}px Inter`;

    const textColor = this.getReadableTextColor(bgColor);

    const maxWidth = w - pad * 2;
    if (ctx.measureText(label).width > maxWidth) {
      label = this.initials(name, 2);
      if (ctx.measureText(label).width > maxWidth) label = this.initials(name, 1);
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle =
      textColor === '#111827' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)';
    ctx.strokeText(label, x + w / 2, y + h / 2);

    ctx.fillStyle = textColor;
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private ellipsize(text: string, maxChars: number) {
    const t = (text ?? '').trim();
    if (t.length <= maxChars) return t;
    return t.slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
  }

  private initials(text: string, maxLetters: number) {
    const parts = (text ?? '').trim().split(/[\s\-_]+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, maxLetters).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  }

  private getReadableTextColor(hex: string): '#111827' | '#ffffff' {
    const c = (hex || '').replace('#', '');
    if (c.length !== 6) return '#111827';
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
  }
}
