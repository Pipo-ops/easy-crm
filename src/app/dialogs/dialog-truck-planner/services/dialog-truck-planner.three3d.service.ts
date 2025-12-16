import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Crate } from '../../../models/truck-planner.types';

@Injectable({ providedIn: 'root' })
export class DialogTruckPlannerThree3DService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId: number | null = null;

  init(canvas: HTMLCanvasElement, truckLength: number, truckWidth: number, crates: Crate[]) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf3f4f6);

    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 320;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    this.camera.position.set(truckLength * 0.8, truckLength * 0.8, truckWidth * 1.6);
    this.camera.lookAt(truckLength / 2, 0, truckWidth / 2);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 60;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 10, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    // truck bed
    const bedGeom = new THREE.BoxGeometry(truckLength, 0.1, truckWidth);
    const bedMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
    const bedMesh = new THREE.Mesh(bedGeom, bedMat);
    bedMesh.position.set(truckLength / 2, -0.05, truckWidth / 2);
    bedMesh.receiveShadow = true;
    this.scene.add(bedMesh);

    // meshes
    for (const c of crates) this.createOrUpdateCrateMesh(c);
  }

  start() {
    this.animate();
  }

  stop() {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  resize(canvas: HTMLCanvasElement) {
    if (!this.camera || !this.renderer) return;

    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 320;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.stop();
    if (this.renderer) this.renderer.dispose();
  }

  createOrUpdateCrateMesh(crate: Crate) {
    if (!this.scene) return;

    if (crate.mesh) {
      this.scene.remove(crate.mesh);
      crate.mesh.geometry.dispose();
      (crate.mesh.material as any)?.dispose?.();
      crate.mesh = undefined;
    }

    const geom = new THREE.BoxGeometry(crate.w_m, crate.depth_m, crate.h_m);
    const mat = new THREE.MeshPhongMaterial({
      color: crate.color as any,
      shininess: 30,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;

    crate.mesh = mesh;
    this.scene.add(mesh);
    this.updateCrateMeshPosition(crate);
  }

  updateCrateMeshPosition(crate: Crate) {
    if (!crate.mesh) return;
    crate.mesh.position.x = crate.x_m + crate.w_m / 2;
    crate.mesh.position.z = crate.y_m + crate.h_m / 2;
    crate.mesh.position.y = crate.depth_m / 2;
  }

  removeCrateMesh(crate: Crate) {
    if (!crate.mesh || !this.scene) return;
    this.scene.remove(crate.mesh);
    crate.mesh.geometry.dispose();
    (crate.mesh.material as any)?.dispose?.();
    crate.mesh = undefined;
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  };
}
