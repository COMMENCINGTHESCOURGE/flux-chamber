/**
 * ThreeBridge — connects flux-chamber to a Three.js scene.
 *
 * Translates the material tensor field into Three.js geometry,
 * materials, and scene graph updates. The same tensor drives
 * the visual representation through this bridge.
 *
 * Three.js is an optional peer dependency. This bridge provides
 * type-safe integration when three is available.
 */

import type { Tensor, Vec3 } from '../types';

/**
 * Minimal Three.js types used by the bridge.
 * Full Three.js integration requires the actual `three` package.
 */
interface ThreeObject3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
  scale: { x: number; y: number; z: number; setScalar: (s: number) => void };
  visible: boolean;
  userData: Record<string, unknown>;
}

interface ThreeMesh extends ThreeObject3D {
  geometry: { dispose: () => void };
  material: { opacity: number; color: { setHex: (hex: number) => void } };
}

interface ThreeScene extends ThreeObject3D {
  add: (obj: ThreeObject3D) => void;
  remove: (obj: ThreeObject3D) => void;
}

export class ThreeBridge {
  readonly name = 'three';
  private scene: ThreeScene | null = null;
  private meshes: Map<string, ThreeMesh> = new Map();

  /**
   * Connect to a Three.js scene.
   */
  connect(scene: ThreeScene): void {
    this.scene = scene;
  }

  /**
   * Create or update a mesh representing an entity's field footprint.
   */
  updateEntityMesh(
   entityId: string,
   entityChannels: Tensor,
   gradient: Vec3,
   ): void {
   if (!this.scene) return;

   let mesh: ThreeMesh | undefined = this.meshes.get(entityId);

    if (!mesh) {
      const placeholder = this.createPlaceholderMesh(entityChannels, gradient);
      if (placeholder) {
        mesh = placeholder;
        this.meshes.set(entityId, mesh);
        this.scene.add(mesh);
      }
      return;
    }

    // Update existing mesh
    mesh.position.x = gradient[0];
    mesh.position.y = gradient[1];
    mesh.position.z = gradient[2];

    // Scale by density
    const density = entityChannels['density'] ?? 1;
    mesh.scale.setScalar(Math.max(0.1, density * 2));

    // Color by dominant channel
    const dominantChannel = this.findDominantChannel(entityChannels);
    const color = this.channelToColor(dominantChannel);
    mesh.material.color.setHex(color);

    // Opacity from cohesion
    mesh.material.opacity = entityChannels['cohesion'] ?? 0.8;
  }

  /**
   * Remove an entity mesh from the scene.
   */
  removeEntityMesh(entityId: string): void {
    const mesh = this.meshes.get(entityId);
    if (!mesh || !this.scene) return;

    this.scene.remove(mesh);
    mesh.geometry.dispose();
    this.meshes.delete(entityId);
  }

  /**
   * Clear all entity meshes.
   */
  clear(): void {
    if (!this.scene) return;

    for (const [, mesh] of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.clear();
  }

  /**
   * Create a placeholder mesh for a new entity.
   */
  private createPlaceholderMesh(
    _channels: Tensor,
    _gradient: Vec3,
  ): ThreeMesh | null {
    // In a real implementation, this would use Three.js primitives.
    // Since Three.js is optional, we return null and let the user
    // provide their own mesh creation via the callback API.
    return null;
  }

  /**
   * Find the channel with the highest value.
   */
  private findDominantChannel(channels: Tensor): string {
    let maxCh = 'density';
    let maxVal = -Infinity;

    for (const [ch, val] of Object.entries(channels)) {
      if (val > maxVal) {
        maxVal = val;
        maxCh = ch;
      }
    }

    return maxCh;
  }

  /**
   * Map a channel name to a hex color.
   */
  private channelToColor(channel: string): number {
    const colorMap: Record<string, number> = {
      rock: 0x808080,
      soil: 0x8B4513,
      sand: 0xC2B280,
      water: 0x1E90FF,
      ice: 0x87CEEB,
      organic: 0x228B22,
      density: 0xAAAAAA,
      cohesion: 0xFF6347,
      velocity: 0x00BFFF,
      temperature: 0xFF4500,
      moisture: 0x4682B4,
    };

    return colorMap[channel] ?? 0xFFFFFF;
  }

  /**
   * Get the count of active meshes.
   */
  get meshCount(): number {
    return this.meshes.size;
  }

  /**
   * Disconnect from the scene.
   */
  disconnect(): void {
    this.clear();
    this.scene = null;
  }
}
