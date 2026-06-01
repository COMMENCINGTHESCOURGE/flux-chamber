/**
 * GradientUtils — gradient computation utilities for field-based operations.
 *
 * Provides numerical gradient estimation, Laplacian operators, divergence,
 * and curl for tensor fields. These are the low-level building blocks
 * for gradient-following agents and field analysis.
 */

import type { Vec3, Tensor } from '../types';

export class GradientUtils {
  /**
   * Compute the gradient of a scalar field using central finite differences.
   * @param fn A function that returns the field value at (x, y, z)
   * @param position The point at which to compute the gradient
   * @param delta The step size for finite differences
   */
  static centralDifference(
    fn: (x: number, y: number, z: number) => number,
    [x, y, z]: Vec3,
    delta = 1,
  ): Vec3 {
    const dx = (fn(x + delta, y, z) - fn(x - delta, y, z)) / (2 * delta);
    const dy = (fn(x, y + delta, z) - fn(x, y - delta, z)) / (2 * delta);
    const dz = (fn(x, y, z + delta) - fn(x, y, z - delta)) / (2 * delta);
    return [dx, dy, dz];
  }

  /**
   * Compute the gradient magnitude.
   */
  static magnitude(gradient: Vec3): number {
    return Math.sqrt(
      gradient[0] * gradient[0] +
      gradient[1] * gradient[1] +
      gradient[2] * gradient[2],
    );
  }

  /**
   * Normalize a gradient to unit length.
   */
  static normalize(gradient: Vec3): Vec3 {
    const mag = GradientUtils.magnitude(gradient);
    if (mag === 0) return [0, 0, 0];
    return [
      gradient[0] / mag,
      gradient[1] / mag,
      gradient[2] / mag,
    ];
  }

  /**
   * Compute the divergence of a vector field.
   * div(V) = dVx/dx + dVy/dy + dVz/dz
   */
  static divergence(
    fn: (x: number, y: number, z: number) => Vec3,
    position: Vec3,
    delta = 1,
  ): number {
    const [x, y, z] = position;

    // Partial derivative of Vx w.r.t. x
    const dvx_dx = (
      fn(x + delta, y, z)[0] - fn(x - delta, y, z)[0]
    ) / (2 * delta);

    // Partial derivative of Vy w.r.t. y
    const dvy_dy = (
      fn(x, y + delta, z)[1] - fn(x, y - delta, z)[1]
    ) / (2 * delta);

    // Partial derivative of Vz w.r.t. z
    const dvz_dz = (
      fn(x, y, z + delta)[2] - fn(x, y, z - delta)[2]
    ) / (2 * delta);

    return dvx_dx + dvy_dy + dvz_dz;
  }

  /**
   * Compute the curl of a vector field.
   * curl(V) = (dVz/dy - dVy/dz, dVx/dz - dVz/dx, dVy/dx - dVx/dy)
   */
  static curl(
    fn: (x: number, y: number, z: number) => Vec3,
    position: Vec3,
    delta = 1,
  ): Vec3 {
    const [x, y, z] = position;

    const plusY = fn(x, y + delta, z);
    const minusY = fn(x, y - delta, z);
    const plusZ = fn(x, y, z + delta);
    const minusZ = fn(x, y, z - delta);
    const plusX = fn(x + delta, y, z);
    const minusX = fn(x - delta, y, z);

    // dVz/dy
    const dvz_dy = (plusY[2] - minusY[2]) / (2 * delta);
    // dVy/dz
    const dvy_dz = (plusZ[1] - minusZ[1]) / (2 * delta);
    // dVx/dz
    const dvx_dz = (plusZ[0] - minusZ[0]) / (2 * delta);
    // dVz/dx
    const dvz_dx = (plusX[2] - minusX[2]) / (2 * delta);
    // dVy/dx
    const dvy_dx = (plusX[1] - minusX[1]) / (2 * delta);
    // dVx/dy
    const dvx_dy = (plusY[0] - minusY[0]) / (2 * delta);

    return [
      dvz_dy - dvy_dz,  // x-component
      dvx_dz - dvz_dx,  // y-component
      dvy_dx - dvx_dy,  // z-component
    ];
  }

  /**
   * Compute the Laplacian of a scalar field (∇²f).
   * Sum of second partial derivatives.
   */
  static laplacian(
    fn: (x: number, y: number, z: number) => number,
    position: Vec3,
    delta = 1,
  ): number {
    const [x, y, z] = position;

    const ddx = fn(x + delta, y, z) - 2 * fn(x, y, z) + fn(x - delta, y, z);
    const ddy = fn(x, y + delta, z) - 2 * fn(x, y, z) + fn(x, y - delta, z);
    const ddz = fn(x, y, z + delta) - 2 * fn(x, y, z) + fn(x, y, z - delta);

    return (ddx + ddy + ddz) / (delta * delta);
  }

  /**
   * Compute the gradient from a tensor sample function.
   * Useful when you have a multi-channel field and want
   * the gradient of one specific channel.
   */
  static fromTensorField(
    sampleFn: (x: number, y: number, z: number) => Tensor,
    channel: string,
    position: Vec3,
    delta = 1,
  ): Vec3 {
    return GradientUtils.centralDifference(
      (x, y, z) => sampleFn(x, y, z)[channel] ?? 0,
      position,
      delta,
    );
  }

  /**
   * Smooth a gradient using exponential moving average.
   * Prevents jittery agent movement.
   */
  static smooth(
    current: Vec3,
    previous: Vec3,
    smoothing = 0.5,
  ): Vec3 {
    return [
      current[0] * (1 - smoothing) + previous[0] * smoothing,
      current[1] * (1 - smoothing) + previous[1] * smoothing,
      current[2] * (1 - smoothing) + previous[2] * smoothing,
    ];
  }
}
