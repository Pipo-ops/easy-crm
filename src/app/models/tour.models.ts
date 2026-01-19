export type Tour = {
  id: string;
  companyId: string;
  company: string;
  name: string;
  person: string;
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
  createdAt?: number;
  boxes?: Box[];
  confirmedTruckIds?: string[];
};

export type Truck = {
  id: string;
  name: string;
  image?: string;
  length?: number;     // m
  width?: number;      // m
  area?: number;       // m²
  maxWeight?: number;  // kg

  isExtra?: boolean;   // extra truck not linked to a tour
  tourId?: string;     // extra truck not linked to a tour
};

export type Category = {
  id: string;
  name: string;
  image?: string;
};

export type Article = {
  id: string;
  name: string;
  image?: string;
  gewicht?: number;
  stueck?: number;
  laenge?: number; // cm
  breite?: number; // cm
  kistenGewicht?: number;
};

export type Box = {
  id: string;
  articleName: string;
  pieces: number;

  area: number;   // m² (UI)
  weight: number; // kg

  truckId?: string | null;

  // echte Maße
  lengthM?: number;
  widthM?: number;
  heightM?: number;

  lengthCm?: number;
  widthCm?: number;

  // optionales Layout (Planner)
  x_m?: number;
  y_m?: number;
  w_m?: number;
  h_m?: number;
};
