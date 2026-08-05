import { defineConfig } from 'vitest/config';

/**
 * Las sondas (`*.probe.ts`) llaman a servicios de verdad y cuestan dinero, así
 * que no pueden colarse en `pnpm test`: viven en su propia configuración y se
 * ejecutan a mano con `pnpm probe:explain`.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.probe.ts'],
  },
});
