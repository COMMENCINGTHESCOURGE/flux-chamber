/**
 * CanvasBridge — renders flux-chamber state to a 2D Canvas context.
 *
 * Useful for debug visualization, HUD overlays, or simple 2D games
 * that use the field substrate. Maps tensor channels to color
 * and renders entity footprints as circles with channel-weighted colors.
 */

import type { Tensor, Vec3 } from '../types';

export class CanvasBridge {
  readonly name = 'canvas';
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /**
   * Connect to a Canvas element.
   */
  connect(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Render the current field state as a 2D overlay.
   * Projects 3D positions to 2D via simple orthographic projection.
   */
  renderField(
    entities: Array<{ id: string; channels: Tensor; gradient: Vec3 }>,
    camera?: { x: number; y: number; zoom: number },
  ): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    const cx = camera?.x ?? 0;
    const cy = camera?.y ?? 0;
    const zoom = camera?.zoom ?? 1;

    // Render entities
    for (const entity of entities) {
      this.renderEntity(ctx, entity, w, h, cx, cy, zoom);
    }

    // Render HUD
    this.renderHUD(ctx, entities.length);
  }

  /**
   * Render a single entity as a colored circle with field indicators.
   */
  private renderEntity(
    ctx: CanvasRenderingContext2D,
    entity: { id: string; channels: Tensor; gradient: Vec3 },
    w: number,
    h: number,
    cx: number,
    cy: number,
    zoom: number,
  ): void {
    // Project 3D gradient to 2D screen position
    const screenX = w / 2 + (entity.gradient[0] - cx) * zoom;
    const screenY = h / 2 + (entity.gradient[2] - cy) * zoom; // Z → Y on screen

    // Skip off-screen entities
    if (screenX < -50 || screenX > w + 50 || screenY < -50 || screenY > h + 50) return;

    // Radius from density
    const density = entity.channels['density'] ?? 1;
    const radius = Math.max(2, density * 10 * zoom);

    // Color from dominant channel
    const dominant = this.findDominantChannel(entity.channels);
    const color = this.channelToCSS(dominant);
    const cohesion = entity.channels['cohesion'] ?? 0.8;

    // Draw entity
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0.1, cohesion);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw gradient direction as a line
    const gx = entity.gradient[0] * zoom;
    const gz = entity.gradient[2] * zoom;
    const gradLen = Math.sqrt(gx * gx + gz * gz);

    if (gradLen > 0.5) {
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + gx * 3, screenY + gz * 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw entity ID for debug
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '8px monospace';
    ctx.fillText(entity.id.slice(-4), screenX - 8, screenY - radius - 4);
  }

  /**
   * Render a debug HUD.
   */
  private renderHUD(ctx: CanvasRenderingContext2D, entityCount: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '10px monospace';
    ctx.fillText(`entities: ${entityCount}`, 4, 12);
  }

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

  private channelToCSS(channel: string): string {
    const colorMap: Record<string, string> = {
      rock: '#808080',
      soil: '#8B4513',
      sand: '#C2B280',
      water: '#1E90FF',
      ice: '#87CEEB',
      organic: '#228B22',
      density: '#AAAAAA',
      cohesion: '#FF6347',
      velocity: '#00BFFF',
      temperature: '#FF4500',
      moisture: '#4682B4',
    };
    return colorMap[channel] ?? '#FFFFFF';
  }

  /**
   * Get the canvas dimensions.
   */
  get size(): { width: number; height: number } | null {
    if (!this.canvas) return null;
    return { width: this.canvas.width, height: this.canvas.height };
  }

  /**
   * Disconnect from the canvas.
   */
  disconnect(): void {
    this.canvas = null;
    this.ctx = null;
  }
}
