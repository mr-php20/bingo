import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.GITHUB_PAGES === 'true' ? '/2048/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
});
