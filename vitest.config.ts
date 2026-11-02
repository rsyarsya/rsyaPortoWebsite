import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Worktrees and temporary audit tools can live below the checkout locally.
    // Only this project's maintained tests belong to its test run.
    include: ['tests/**/*.test.ts'],
  },
});
