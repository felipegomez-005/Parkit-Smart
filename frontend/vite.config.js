import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cada build escribe una versión nueva en dist/sw.js para invalidar la caché vieja.
function swVersion() {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'sw-version',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
      root = config.root;
    },
    closeBundle() {
      const file = path.resolve(root, outDir, 'sw.js');
      if (!existsSync(file)) return;
      const version = Date.now().toString(36);
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__BUILD_VERSION__', version));
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersion()],
  server: { host: '0.0.0.0', port: 5173 },
});
