import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { airbnbSource } from '../airbnb/adapter';
import { createEnhancer, observePage } from '../application/enhancer';
import { annotationRenderer } from '../ui/annotation';

export default defineContentScript({
  matches: [
    'https://*.airbnb.com/*',
    'https://*.airbnb.co.uk/*',
    'https://*.airbnb.ca/*',
    'https://*.airbnb.com.au/*',
    'https://*.airbnb.co.nz/*',
    'https://*.airbnb.ie/*',
  ],
  runAt: 'document_idle',
  async main(ctx) {
    const enhancer = createEnhancer(
      document,
      () => new URL(location.href),
      airbnbSource,
      annotationRenderer,
      (mode) => {
        void browser.storage.local.set({ priceMode: mode }).catch(() => {});
      },
    );
    enhancer.setEnabled(false);
    const stored = await browser.storage.local.get(['enabled', 'priceMode']);
    if (ctx.isInvalid) return;
    enhancer.setMode(stored.priceMode === 'person' ? 'person' : 'total');
    enhancer.setEnabled(stored.enabled !== false);
    const stop = observePage(document, enhancer.refresh);
    const onChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && changes.priceMode)
        enhancer.setMode(changes.priceMode.newValue === 'person' ? 'person' : 'total');
      if (area === 'local' && changes.enabled)
        enhancer.setEnabled(changes.enabled.newValue !== false);
    };
    browser.storage.onChanged.addListener(onChange);
    ctx.onInvalidated(() => {
      stop();
      enhancer.destroy();
      browser.storage.onChanged.removeListener(onChange);
    });
  },
});
