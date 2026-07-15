import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: resolve(__dirname, 'tests/__mocks__/obsidian.ts'),
		},
	},
	test: {
		globals: true,
		setupFiles: ['tests/setup.ts'],
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'lcov', 'json'],
			include: ['src/**/*.ts'],
		},
	},
});
