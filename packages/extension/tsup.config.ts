import { defineConfig } from 'tsup';
import * as fs from 'fs';
import * as path from 'path';

export default defineConfig({
  entry: {
    content: 'src/content.ts',
    background: 'src/background.ts',
    popup: 'src/popup.ts',
  },
  format: ['iife'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false,
  outExtension() {
    return {
      js: '.js',
    };
  },
  noExternal: [/@domsynapse\//],
  async onSuccess() {
    // Copy manifest and static files to dist directory
    const distDir = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    const filesToCopy = [
      { from: 'manifest.json', to: 'manifest.json' },
      { from: 'src/popup.html', to: 'popup.html' },
      { from: 'src/content.css', to: 'content.css' },
    ];

    for (const item of filesToCopy) {
      const srcPath = path.resolve(__dirname, item.from);
      const destPath = path.resolve(distDir, item.to);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log('[DomSynapse Extension] Static assets copied to dist.');
  },
});
