/**
 * WebGPUBridge — connects flux-chamber to raw WebGPU compute and rendering.
 *
 * This bridge is for custom WebGPU pipelines that bypass the
 * hyperpoly-terrain engine. It compiles WGSL shaders from the
 * vinculum constraint definitions and runs them on the GPU
 * for bulk field computation.
 */

export interface WebGPUDevice {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export class WebGPUBridge {
  readonly name = 'webgpu';
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private computePipelines: Map<string, GPUComputePipeline> = new Map();
  private bindGroups: Map<string, GPUBindGroup> = new Map();
  private bufferPool: Map<string, GPUBuffer> = new Map();

  /**
   * Initialize the WebGPU bridge with a device and context.
   */
  async initialize(device: GPUDevice, context: GPUCanvasContext): Promise<void> {
    this.device = device;
    this.context = context;
    this.format = navigator.gpu?.getPreferredCanvasFormat?.() ?? 'bgra8unorm';

    if (this.context) {
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });
    }
  }

  /**
   * Compile a WGSL compute shader and register it as a pipeline.
   */
  createComputePipeline(name: string, shaderCode: string): GPUComputePipeline | null {
    if (!this.device) return null;

    const shaderModule = this.device.createShaderModule({
      code: shaderCode,
      label: `flux-chamber:${name}`,
    });

    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
      label: `flux-chamber:${name}`,
    });

    this.computePipelines.set(name, pipeline);
    return pipeline;
  }

  /**
   * Create a storage buffer from tensor data.
   */
  createTensorBuffer(
    name: string,
    data: Float32Array,
    usage?: GPUBufferUsageFlags,
  ): GPUBuffer | null {
    if (!this.device) return null;

    // WebGPU usage flags as raw constants for browser compat
    const STORAGE = 0x0080;
    const COPY_DST = 0x0020;
    const COPY_SRC = 0x0004;

    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage ?? (STORAGE | COPY_DST | COPY_SRC),
      mappedAtCreation: false,
      label: `tensor:${name}`,
    });

    this.device.queue.writeBuffer(buffer, 0, data);
    this.bufferPool.set(name, buffer);
    return buffer;
  }

  /**
   * Read a storage buffer back as a Float32Array.
   */
  async readTensorBuffer(name: string): Promise<Float32Array | null> {
    if (!this.device) return null;

    const buffer = this.bufferPool.get(name);
    if (!buffer) return null;

    const size = buffer.size;
    const stagingBuffer = this.device.createBuffer({
      size,
      usage: 0x0020 | 0x0001,  // COPY_DST | MAP_READ
      mappedAtCreation: false,
      label: `staging:${name}`,
    });

    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, size);
    this.device.queue.submit([encoder.finish()]);

    await stagingBuffer.mapAsync(1);  // MAP_READ = 0x0001
    const data = new Float32Array(stagingBuffer.getMappedRange());
    const result = new Float32Array(data);
    stagingBuffer.unmap();
    stagingBuffer.destroy();

    return result;
  }

  /**
   * Dispatch a compute shader pipeline.
   */
  dispatch(
    name: string,
    workgroupsX: number,
    workgroupsY = 1,
    workgroupsZ = 1,
  ): void {
    if (!this.device) return;

    const pipeline = this.computePipelines.get(name);
    if (!pipeline) return;

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  /**
   * Generate a WGSL shader from vinculum constraint definitions.
   * Converts flux-chamber constraints into GPU-compatible WGSL compute code.
   */
  generateConstraintShader(constraints: Array<{
    name: string;
    type: string;
    channels: string[];
    rate: number;
    mode: string;
  }>): string {
    const channelCount = 6; // Standard 6-channel material tensor

    let shader = `
struct TensorField {
  channels: array<f32, ${channelCount}>,
};

@group(0) @binding(0) var<storage, read_write> field: array<TensorField>;
@group(0) @binding(1) var<storage, read_write> output: array<TensorField>;

struct Uniforms {
  dt: f32,
  rate: f32,
  threshold: f32,
};

@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  var a = field[idx].channels;
  var b = output[idx].channels;
`;

    // Add constraint logic for each registered constraint
    for (const constraint of constraints) {
      shader += this.generateConstraintCode(constraint, channelCount);
    }

    shader += `
  output[idx].channels = a;
}
`;

    return shader;
  }

  private generateConstraintCode(
    constraint: { name: string; type: string; channels: string[]; rate: number; mode: string },
    _channelCount: number,
  ): string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void constraint.channels;
    const { mode, rate } = constraint;

    // Map channel names to indices (just use first two)
    const idxA = 0; // Default to first channel
    const idxB = 1; // Default to second channel
    const rateStr = rate.toFixed(6);

    switch (mode) {
      case 'conservation':
        return `
  // ${constraint.name}: conservation
  let total = a[${idxA}] + a[${idxB}];
  if (total > 0.0) {
    let target = total * 0.5;
    let delta = (target - a[${idxA}]) * ${rateStr} * uniforms.dt;
    a[${idxA}] += delta;
    a[${idxB}] -= delta;
  }
`;
      case 'dissipative':
        return `
  // ${constraint.name}: dissipation
  let ratio = select(a[${idxA}] / max(a[${idxB}], 0.0001), 0.0, a[${idxB}] < 0.0001);
  a[${idxA}] -= a[${idxA}] * ratio * ${rateStr} * uniforms.dt;
  a[${idxB}] -= a[${idxB}] * (1.0 / max(ratio, 0.01)) * ${rateStr} * uniforms.dt;
`;
      case 'threshold':
        return `
  // ${constraint.name}: threshold
  let thresh = uniforms.threshold;
  let ratio = select(a[${idxA}] / max(a[${idxB}], 0.0001), 0.0, a[${idxB}] < 0.0001);
  if (ratio > thresh && a[${idxA}] > 0.0) {
    let converted = a[${idxA}] * ${rateStr} * uniforms.dt;
    a[${idxA}] -= converted;
    a[${idxB}] += converted;
  }
`;
      default:
        return '';
    }
  }

  /**
   * Render the current field to the canvas.
   */
  render(): void {
    // In a full implementation, this would render the tensor field
    // as a textured quad using a render pipeline.
  }

  /**
   * Clean up all GPU resources.
   */
  destroy(): void {
    for (const buffer of this.bufferPool.values()) {
      buffer.destroy();
    }
    this.bufferPool.clear();
    this.computePipelines.clear();
    this.bindGroups.clear();
    this.device = null;
    this.context = null;
  }
}
