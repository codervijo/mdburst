// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://mdburst.com',
  integrations: [sitemap(), react()],
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
