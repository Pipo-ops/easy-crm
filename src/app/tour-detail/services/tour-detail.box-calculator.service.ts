import { Injectable } from '@angular/core';
import { Article, Box } from '../../models/tour.models';

@Injectable({ providedIn: 'root' })
export class TourDetailBoxCalculatorService {
  recalcTotals(boxes: Box[]) {
    const totalArea = boxes.reduce((s, b) => s + (b.area ?? 0), 0);
    const totalWeight = boxes.reduce((s, b) => s + (b.weight ?? 0), 0);
    return { totalArea, totalWeight };
  }

  recalcPreview(article: Article | null, amount: number) {
    const qty = amount || 0;
    if (!article || qty <= 0) return { previewArea: 0, previewWeight: 0 };

    const stueckProKiste = article.stueck ?? 1;
    const kistenAnzahl = Math.ceil(qty / stueckProKiste);
    const flaecheProKiste =
      ((article.laenge ?? 0) * (article.breite ?? 0)) / 10000; // cm² -> m²

    let area = 0;
    let weight = 0;

    for (let i = 0; i < kistenAnzahl; i++) {
      const stueckInDieserKiste =
        i === kistenAnzahl - 1
          ? qty % stueckProKiste || stueckProKiste
          : stueckProKiste;

      const kistenGewicht =
        (article.gewicht ?? 0) * stueckInDieserKiste +
        (article.kistenGewicht ?? 0);

      area += flaecheProKiste;
      weight += kistenGewicht;
    }

    return {
      previewArea: +area.toFixed(2),
      previewWeight: +weight.toFixed(2),
    };
  }

  addBoxesFromArticle(existing: Box[], article: Article, amount: number): Box[] {
    const qty = amount || 0;
    if (!article || qty <= 0) return existing;

    const lengthCm = article.laenge ?? 0;
    const widthCm = article.breite ?? 0;

    const lengthM = lengthCm / 100;
    const widthM = widthCm / 100;

    const stueckProKiste = article.stueck ?? 1;
    const kistenAnzahl = Math.ceil(qty / stueckProKiste);
    const flaecheProKiste = (lengthCm * widthCm) / 10000; // cm² -> m²

    const next = [...existing];

    for (let i = 0; i < kistenAnzahl; i++) {
      const stueckInDieserKiste =
        i === kistenAnzahl - 1
          ? qty % stueckProKiste || stueckProKiste
          : stueckProKiste;

      const kistenGewicht =
        (article.gewicht ?? 0) * stueckInDieserKiste +
        (article.kistenGewicht ?? 0);

      next.push({
        id:
          (crypto as any).randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        articleName: article.name,
        pieces: stueckInDieserKiste,
        area: +flaecheProKiste.toFixed(2),
        weight: +kistenGewicht.toFixed(2),
        truckId: null,

        lengthM: lengthM > 0 ? +lengthM.toFixed(2) : undefined,
        widthM: widthM > 0 ? +widthM.toFixed(2) : undefined,
        heightM: 1,

        lengthCm: lengthCm || undefined,
        widthCm: widthCm || undefined,
      });
    }

    return next;
  }
}
