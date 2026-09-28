import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  imports: false,
  manifest: {
    name: 'Enhanced Airbnb',
    description: 'See Airbnb prices per night, per person, and per person per night.',
    permissions: ['storage'],
  },
});
