import { Injectable } from '@angular/core';
import { Box, Crate } from '../../../models/truck-planner.types';

@Injectable({ providedIn: 'root' })
export class DialogTruckPlannerPackingService {
  private readonly colors = [
    '#34D399',
    '#60A5FA',
    '#FCD34D',
    '#A78BFA',
    '#FB7185',
    '#22c55e',
    '#f97316',
    '#06b6d4',
  ];

  buildAndPackCrates(args: {
    boxes: Box[];
    truckLength: number;
    truckWidth: number;
  }): { packed: Crate[]; overflow: Crate[] } {
    const { boxes, truckLength, truckWidth } = args;

    const placed: Crate[] = [];
    const unplaced: Crate[] = [];

    const all: Crate[] = boxes.map((b, i) => {
      const hasDims = !!(b.lengthM && b.widthM && b.lengthM > 0 && b.widthM > 0);
      const wFromDims = hasDims ? b.lengthM! : Math.sqrt(b.area || 1);
      const hFromDims = hasDims ? b.widthM! : Math.sqrt(b.area || 1);

      const c: Crate = {
        id: b.id,
        name: b.articleName,
        x_m: 0,
        y_m: 0,
        w_m: Math.max(0.01, wFromDims),
        h_m: Math.max(0.01, hFromDims),
        depth_m: b.heightM ?? 1,
        color: this.colors[i % this.colors.length],
      };

      // gespeichertes Layout übernehmen
      if (this.hasSavedLayout(b)) {
        c.x_m = b.x_m!;
        c.y_m = b.y_m!;
        c.w_m = b.w_m!;
        c.h_m = b.h_m!;
      }

      return c;
    });

    // zuerst valide saved layouts platzieren
    for (const c of all) {
      const hadLayout = boxes.some((b) => b.id === c.id && this.hasSavedLayout(b));
      if (!hadLayout) {
        unplaced.push(c);
        continue;
      }

      if (this.isOutOfBounds(c, truckLength, truckWidth)) {
        unplaced.push({ ...c, x_m: 0, y_m: 0 });
        continue;
      }

      if (this.overlapsAny(c, placed)) {
        unplaced.push({ ...c, x_m: 0, y_m: 0 });
        continue;
      }

      placed.push(c);
    }

    // Rest grob packen und dann “in freie Lücken” einpassen
    const { packed: packedRest, overflow } = this.packCratesGreedy(unplaced, truckLength, truckWidth, true);

    for (const c of packedRest) {
      const ok =
        (!this.isOutOfBounds(c, truckLength, truckWidth) && !this.overlapsAny(c, placed)) ||
        this.tryPlaceAtFirstFreeSpotWithPlaced(c, c.w_m, c.h_m, placed, truckLength, truckWidth) ||
        this.tryPlaceAtFirstFreeSpotWithPlaced(c, c.h_m, c.w_m, placed, truckLength, truckWidth);

      if (ok) placed.push(c);
      else overflow.push(c);
    }

    return { packed: placed, overflow };
  }

  autoLayout(args: {
    crates: Crate[];
    overflow: Crate[];
    truckLength: number;
    truckWidth: number;
  }): { packed: Crate[]; overflow: Crate[] } {
    const { crates, overflow, truckLength, truckWidth } = args;

    const all = [...crates, ...overflow].map((c) => ({
      ...c,
      x_m: 0,
      y_m: 0,
      mesh: undefined,
    }));

    return this.packCratesGreedy(all, truckLength, truckWidth, true);
  }

  rotateIfFits(args: {
    crate: Crate;
    crates: Crate[];
    truckLength: number;
    truckWidth: number;
  }): boolean {
    const { crate, crates, truckLength, truckWidth } = args;

    const candidate: Crate = { ...crate, w_m: crate.h_m, h_m: crate.w_m };
    if (this.isOutOfBounds(candidate, truckLength, truckWidth)) return false;
    if (this.overlapsAny(candidate, crates, crate.id)) return false;

    crate.w_m = candidate.w_m;
    crate.h_m = candidate.h_m;
    return true;
  }

  placeOverflowCrate(args: {
    crate: Crate;
    crates: Crate[];
    truckLength: number;
    truckWidth: number;
  }): boolean {
    const { crate, crates, truckLength, truckWidth } = args;

    return (
      this.tryPlaceAtFirstFreeSpot(crate, crate.w_m, crate.h_m, crates, truckLength, truckWidth) ||
      this.tryPlaceAtFirstFreeSpot(crate, crate.h_m, crate.w_m, crates, truckLength, truckWidth)
    );
  }

  // ---------------- intern ----------------

  private hasSavedLayout(b: Box): boolean {
    return (
      typeof b.x_m === 'number' &&
      typeof b.y_m === 'number' &&
      typeof b.w_m === 'number' &&
      typeof b.h_m === 'number' &&
      (b.w_m ?? 0) > 0 &&
      (b.h_m ?? 0) > 0
    );
  }

  private packCratesGreedy(
    crates: Crate[],
    truckLength: number,
    truckWidth: number,
    allowRotate = true
  ): { packed: Crate[]; overflow: Crate[] } {
    const packed: Crate[] = [];
    const overflow: Crate[] = [];

    const sorted = [...crates].sort((a, b) => b.w_m * b.h_m - a.w_m * a.h_m);

    let x = 0;
    let y = 0;
    let rowH = 0;

    for (const c of sorted) {
      const opts = allowRotate
        ? [{ w: c.w_m, h: c.h_m }, { w: c.h_m, h: c.w_m }]
        : [{ w: c.w_m, h: c.h_m }];

      let placed = false;

      for (const opt of opts) {
        if (x + opt.w > truckLength) {
          x = 0;
          y += rowH;
          rowH = 0;
        }

        if (y + opt.h > truckWidth) continue;

        c.x_m = x;
        c.y_m = y;
        c.w_m = opt.w;
        c.h_m = opt.h;

        packed.push(c);
        x += opt.w;
        rowH = Math.max(rowH, opt.h);
        placed = true;
        break;
      }

      if (!placed) overflow.push(c);
    }

    return { packed, overflow };
  }

  private tryPlaceAtFirstFreeSpotWithPlaced(
    crate: Crate,
    w: number,
    h: number,
    placed: Crate[],
    truckLength: number,
    truckWidth: number
  ): boolean {
    const step = 0.05;
    const test: Crate = { ...crate, w_m: w, h_m: h, x_m: 0, y_m: 0 };

    for (let y = 0; y <= truckWidth - h + 1e-6; y += step) {
      for (let x = 0; x <= truckLength - w + 1e-6; x += step) {
        test.x_m = +x.toFixed(3);
        test.y_m = +y.toFixed(3);

        if (this.isOutOfBounds(test, truckLength, truckWidth)) continue;
        if (this.overlapsAny(test, placed)) continue;

        crate.x_m = test.x_m;
        crate.y_m = test.y_m;
        crate.w_m = w;
        crate.h_m = h;
        return true;
      }
    }
    return false;
  }

  private tryPlaceAtFirstFreeSpot(
    crate: Crate,
    w: number,
    h: number,
    crates: Crate[],
    truckLength: number,
    truckWidth: number
  ): boolean {
    const step = 0.05;
    const test: Crate = { ...crate, w_m: w, h_m: h, x_m: 0, y_m: 0 };

    for (let y = 0; y <= truckWidth - h + 1e-6; y += step) {
      for (let x = 0; x <= truckLength - w + 1e-6; x += step) {
        test.x_m = +x.toFixed(3);
        test.y_m = +y.toFixed(3);

        if (this.isOutOfBounds(test, truckLength, truckWidth)) continue;
        if (this.overlapsAny(test, crates, crate.id)) continue;

        crate.x_m = test.x_m;
        crate.y_m = test.y_m;
        crate.w_m = w;
        crate.h_m = h;
        return true;
      }
    }
    return false;
  }

  private overlapsAny(test: Crate, list: Crate[], skipId?: string): boolean {
    for (const other of list) {
      if (skipId && other.id === skipId) continue;

      const overlap =
        test.x_m < other.x_m + other.w_m &&
        test.x_m + test.w_m > other.x_m &&
        test.y_m < other.y_m + other.h_m &&
        test.y_m + test.h_m > other.y_m;

      if (overlap) return true;
    }
    return false;
  }

  private isOutOfBounds(c: Crate, truckLength: number, truckWidth: number): boolean {
    return (
      c.x_m < -1e-6 ||
      c.y_m < -1e-6 ||
      c.x_m + c.w_m > truckLength + 1e-6 ||
      c.y_m + c.h_m > truckWidth + 1e-6
    );
  }
}
