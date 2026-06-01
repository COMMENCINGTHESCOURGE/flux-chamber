/* eslint-disable */
// Minimal WebGPU type declarations for TypeScript
// These match the WebGPU spec types available in browsers

interface GPUShaderModuleDescriptor {
  code: string;
  label?: string;
}

interface GPUComputePipelineDescriptor {
  layout: 'auto' | GPUAutoLayoutMode;
  compute: { module: GPUShaderModule; entryPoint: string };
  label?: string;
}

interface GPUBufferDescriptor {
  size: number;
  usage: number;
  mappedAtCreation: boolean;
  label?: string;
}

interface GPUDevice {
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createCommandEncoder(): GPUCommandEncoder;
  readonly queue: GPUQueue;
}

interface GPUCanvasContext {
  configure(config: { device: GPUDevice; format: GPUTextureFormat; alphaMode: string }): void;
}

type GPUTextureFormat = string;
type GPUAutoLayoutMode = string;

interface GPUComputePipeline {}
interface GPUBindGroup {}

interface GPUBuffer {
  readonly size: number;
  destroy(): void;
  mapAsync(mode: number): Promise<void>;
  getMappedRange(offset?: number, size?: number): Float32Array;
  unmap(): void;
}

type GPUBufferUsageFlags = number;
interface GPUShaderModule {}
interface GPUCommandEncoder {
  beginComputePass(): GPUComputePassEncoder;
  copyBufferToBuffer(src: GPUBuffer, srcOffset: number, dst: GPUBuffer, dstOffset: number, size: number): void;
  finish(): GPUCommandBuffer;
}

interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  end(): void;
}

interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
  writeBuffer(buffer: GPUBuffer, offset: number, data: Float32Array): void;
}

interface GPUCommandBuffer {}

interface Navigator {
  readonly gpu?: {
    getPreferredCanvasFormat(): GPUTextureFormat;
  };
}
