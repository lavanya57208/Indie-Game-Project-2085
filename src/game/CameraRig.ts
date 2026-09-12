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
  private baseFov = 65;
  private currentFov = 65;
  private targetFov = 65;
  private baseOffset = new THREE.Vector3(0, 4.5, 8);
  private baseLookAt = new THREE.Vector3(0, 1.5, 0);
  // Smoothed player Y to prevent camera jitter during jumps
  private smoothedPlayerY = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 200);
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

    // FOV increase during chase for intensity
    this.targetFov = isChasing ? 75 : isSprinting ? 70 : this.baseFov;
    this.currentFov += (this.targetFov - this.currentFov) * Math.min(1, dt * 2);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.1) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Smooth the player's Y position to prevent camera jitter during jump/land.
    // Gentler lerp on Y so the camera floats smoothly rather than snapping.
    const yLerpFactor = Math.min(1, dt * 3.5);
    this.smoothedPlayerY += (player.y - this.smoothedPlayerY) * yLerpFactor;

    const offset = this.baseOffset.clone().multiplyScalar(this.zoom);
    if (isChasing) {
      offset.z += 2.5;
      offset.y += 1.5;
    }

    this.target.set(
      player.x * 0.3,
      this.smoothedPlayerY + offset.y,
      player.z + offset.z
    );

    // Smooth follow — frame-rate independent damping
    const followLerp = 1 - Math.pow(0.001, dt);
    this.currentPos.lerp(this.target, followLerp);

    // Shake — only during chase (continuous) and impact events (decaying)
    let shakeX = 0, shakeY = 0;
    if (isChasing && this.shakeEnabled) {
      shakeX += (Math.random() - 0.5) * 0.08;
      shakeY += (Math.random() - 0.5) * 0.08;
    }
    if (this.shake > 0.01) {
      shakeX += (Math.random() - 0.5) * this.shake * 0.5;
      shakeY += (Math.random() - 0.5) * this.shake * 0.5;
      this.shake *= 0.9;
    }

    this.camera.position.set(
      this.currentPos.x + shakeX,
      this.currentPos.y + shakeY,
      this.currentPos.z
    );

    // Look at player using smoothed Y for stable vertical tracking
    const lookTarget = new THREE.Vector3(
      player.x * 0.4,
      this.smoothedPlayerY + this.baseLookAt.y,
      player.z - 5
    );
    if (isChasing && alienZ !== undefined) {
      lookTarget.z = player.z - 2 + (alienZ - player.z) * 0.15;
      lookTarget.y = this.smoothedPlayerY + this.baseLookAt.y + 0.5;
    }
    this.camera.lookAt(lookTarget);

    // Tilt while turning — enhanced during chase
    const tiltMultiplier = isChasing ? 1.5 : 1;
    const tilt = (player.x - 0) * 0.02 * tiltMultiplier;
    this.camera.rotation.z += tilt;
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
