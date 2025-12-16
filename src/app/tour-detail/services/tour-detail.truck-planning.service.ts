import { Injectable } from '@angular/core';
import { Box, Truck } from '../../models/tour.models';

@Injectable({ providedIn: 'root' })
export class TourDetailTruckPlanningService {
  areaOfTruck(t: Truck) {
    return t.area ?? (t.length ?? 0) * (t.width ?? 0);
  }

  updateSelectedCapacity(
    selectedTrucks: Truck[],
    totalArea: number,
    totalWeight: number
  ) {
    const selectedArea = selectedTrucks.reduce(
      (s, t) => s + (this.areaOfTruck(t) || 0),
      0
    );
    const selectedWeight = selectedTrucks.reduce(
      (s, t) => s + (t.maxWeight ?? 0),
      0
    );

    return {
      selectedArea,
      selectedWeight,
      hasEnoughArea: selectedArea >= totalArea,
      hasEnoughWeight: selectedWeight >= totalWeight,
    };
  }

  neededTrucks(allTrucks: Truck[], totalArea: number, totalWeight: number) {
    if ((!totalArea && !totalWeight) || !allTrucks.length) return 0;

    const trucks = allTrucks
      .map((t) => ({
        area: this.areaOfTruck(t),
        weight: t.maxWeight ?? 0,
      }))
      .filter((t) => t.area > 0 || t.weight > 0);

    const n = trucks.length;
    if (!n) return null;

    let best = Infinity;
    const maxMask = 1 << n;

    for (let mask = 1; mask < maxMask; mask++) {
      let a = 0,
        w = 0,
        count = 0;

      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          count++;
          a += trucks[i].area;
          w += trucks[i].weight;
        }
      }

      if (a >= totalArea && w >= totalWeight && count < best) best = count;
    }

    return Number.isFinite(best) ? best : null;
  }

  tryPackBoxesIntoTruck(
    pool: Box[],
    truck: Truck
  ): Map<string, { x_m: number; y_m: number; w_m: number; h_m: number }> {
    const result = new Map<
      string,
      { x_m: number; y_m: number; w_m: number; h_m: number }
    >();

    const truckWidth = truck.width ?? 2.5;
    const truckLength =
      truck.length ??
      (truck.area && truckWidth > 0 ? truck.area / truckWidth : 8);

    const candidates = [...pool].sort((a, b) => {
      const aw = a.lengthM ?? Math.sqrt(a.area || 1);
      const ah = a.widthM ?? Math.sqrt(a.area || 1);
      const bw = b.lengthM ?? Math.sqrt(b.area || 1);
      const bh = b.widthM ?? Math.sqrt(b.area || 1);
      return bw * bh - aw * ah;
    });

    const placed: { id: string; x: number; y: number; w: number; h: number }[] =
      [];

    const step = 0.05;

    const fitsNoOverlap = (x: number, y: number, w: number, h: number) => {
      if (x < 0 || y < 0) return false;
      if (x + w > truckLength + 1e-6) return false;
      if (y + h > truckWidth + 1e-6) return false;

      for (const p of placed) {
        const overlap =
          x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y;
        if (overlap) return false;
      }
      return true;
    };

    const placeOne = (box: Box): boolean => {
      const hasDims = !!(
        box.lengthM &&
        box.widthM &&
        box.lengthM > 0 &&
        box.widthM > 0
      );

      const w0 = hasDims ? box.lengthM! : Math.sqrt(box.area || 1);
      const h0 = hasDims ? box.widthM! : Math.sqrt(box.area || 1);

      const options = [
        { w: w0, h: h0 },
        { w: h0, h: w0 },
      ];

      for (const opt of options) {
        for (let y = 0; y <= truckWidth - opt.h + 1e-6; y += step) {
          for (let x = 0; x <= truckLength - opt.w + 1e-6; x += step) {
            if (fitsNoOverlap(x, y, opt.w, opt.h)) {
              placed.push({ id: box.id, x, y, w: opt.w, h: opt.h });
              result.set(box.id, {
                x_m: +x.toFixed(3),
                y_m: +y.toFixed(3),
                w_m: +opt.w.toFixed(3),
                h_m: +opt.h.toFixed(3),
              });
              return true;
            }
          }
        }
      }

      return false;
    };

    for (const b of candidates) placeOne(b);
    return result;
  }
}
