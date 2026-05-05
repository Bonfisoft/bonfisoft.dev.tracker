import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      'vscode': path.resolve(__dirname, './test/mocks/vscode.ts')
    }
  }
});
