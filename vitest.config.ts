import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/server/test/**/*.test.ts'],
    // Les tests d'intégration partagent une base PostgreSQL : exécution séquentielle des fichiers.
    fileParallelism: false,
  },
});
