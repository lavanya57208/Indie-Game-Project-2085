import * as THREE from 'three';
import { Player } from './Player';

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private currentPos = new THREE.Vector3();
  private shake = 0;
  private shakeEnabled = true;
  private zoom = 1;
  private targetZoom = 1;
  private baseOffset = new THREE.Vector3(0, 4.5, 8);
  private baseLookAt = new THREE.Vector3(0, 1.5, 0);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 200);
    this.currentPos.copy(this.baseOffset);
  }

  setShakeEnabled(enabled: boolean) { this.shakeEnabled = enabled; }

  addShake(amount: number) {
    if (this.shakeEnabled) this.shake = Math.min(this.shake + amount, 1.5);
  }

  setZoom(z: number) { this.targetZoom = z; }

  update(dt: number, player: Player, isChasing: boolean, isSprinting: boolean, alienZ?: number) {
    // Zoom for sprint
    this.targetZoom = isSprinting ? 0.85 : isChasing ? 0.82 : 1;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 3);

    const offset = this.baseOffset.clone().multiplyScalar(this.zoom);
    if (isChasing) {
      offset.z += 2.5;
      offset.y += 1.5;
    }

    this.target.set(
      player.x * 0.3,
      player.y + offset.y,
      player.z + offset.z
    );

    // Smooth follow
    this.currentPos.lerp(this.target, Math.min(1, dt * 5));

    // Shake
    let shakeX = 0, shakeY = 0;
    if (this.shake > 0.01) {
      shakeX = (Math.random() - 0.5) * this.shake * 0.5;
      shakeY = (Math.random() - 0.5) * this.shake * 0.5;
      this.shake *= 0.9;
    }

    this.camera.position.set(
      this.currentPos.x + shakeX,
      this.currentPos.y + shakeY,
      this.currentPos.z
    );

    // Look at a point between player and alien during chase so both are visible
    const lookTarget = new THREE.Vector3(
      player.x * 0.4,
      player.y + this.baseLookAt.y,
      player.z - 5
    );
    if (isChasing && alienZ !== undefined) {
      // Look at midpoint between player and alien, shifted toward player
      lookTarget.z = player.z - 2 + (alienZ - player.z) * 0.15;
      lookTarget.y = player.y + this.baseLookAt.y + 0.5;
    }
    this.camera.lookAt(lookTarget);

    // Tilt while turning
    const tilt = (player.x - 0) * 0.02;
    this.camera.rotation.z += tilt;
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
