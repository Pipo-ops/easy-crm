import * as THREE from 'three';

export type Truck = {
  id: string;
  name: string;
  length?: number; // m
  width?: number; // m
  area?: number; // m²
  maxWeight?: number; // kg
};

export type Box = {
  id: string;
  articleName: string;
  pieces: number;
  area: number; // m² (UI gerundet)
  weight: number; // kg
  truckId?: string | null;

  lengthM?: number; // m
  widthM?: number; // m
  heightM?: number; // m

  x_m?: number;
  y_m?: number;
  w_m?: number;
  h_m?: number;
};

export interface TruckPlannerData {
  truck: Truck;
  boxes: Box[];
}

export interface Crate {
  id: string;
  name: string;
  x_m: number;
  y_m: number;
  w_m: number;      // entlang Länge
  h_m: number;      // entlang Breite
  depth_m: number;  // Höhe für 3D
  color: string;
  mesh?: THREE.Mesh;
}
