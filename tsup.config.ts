import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bridge/hyperpoly': 'src/bridge/hyperpoly.ts',
    'bridge/three': 'src/bridge/three.ts',
    'bridge/canvas': 'src/bridge/canvas.ts',
    'bridge/webgpu': 'src/bridge/webgpu.ts',
    'examples/index': 'examples/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['hyperpoly-terrain', 'three'],
  splitting: true,
});
