import { annotationTag, type PriceSource } from '../airbnb/adapter';
import { calculate } from '../domain/pricing';
import type { AnnotationRenderer } from '../ui/annotation';

import type { PriceMode, PricePresentation } from '../ui/annotation';
import { createPriceModeControl, modeControlTag } from '../ui/price-mode-control';
import { isInternalMutation } from '../ui/dom-writes';

export interface Enhancer {
  refresh(): void;
  setEnabled(enabled: boolean): void;
  setMode(mode: PriceMode): void;
  destroy(): void;
}

export function createEnhancer(
  doc: Document,
  getUrl: () => URL,
  source: PriceSource,
  renderer: AnnotationRenderer,
  onModeChange: (mode: PriceMode) => void = () => {},
): Enhancer {
  let rendered: PricePresentation[] = [];
  let enabled = true;
  let mode: PriceMode = 'total';
  const clear = () => {
    rendered.forEach((presentation) => presentation.restore());
    rendered = [];
  };
  const control = createPriceModeControl(doc, (value) => {
    mode = value;
    refresh();
    onModeChange(value);
  });
  const refresh = () => {
    clear();
    if (!enabled) {
      control.remove();
      return;
    }
    const targets = source.read(doc, getUrl());
    const eligible = targets.map((target) => ({
      target,
      breakdown: calculate(target.price, target.context),
    }));
    const available = eligible.length > 0 && eligible.every(({ breakdown }) => breakdown !== null);
    const effectiveMode = available ? mode : 'total';
    const locale = doc.documentElement.lang || 'en';
    for (const { target, breakdown } of eligible) {
      if (
        !breakdown ||
        !target.element.isConnected ||
        target.element.closest('[hidden], [aria-busy="true"]')
      )
        continue;
      rendered.push(renderer.render(target, breakdown, locale, effectiveMode));
    }
    if (targets.some((target) => target.surface === 'listing'))
      control.update(effectiveMode, available);
    else control.remove();
  };
  return {
    refresh,
    setMode(value) {
      mode = value;
      refresh();
    },
    setEnabled(value) {
      enabled = value;
      refresh();
    },
    destroy() {
      clear();
      control.remove();
    },
  };
}

const owned = (node: Node): boolean => {
  const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return !!element?.closest(`${annotationTag}, ${modeControlTag}`);
};

export function observePage(doc: Document, refresh: () => void): () => void {
  const win = doc.defaultView;
  if (!win) return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      refresh();
    }, 150);
  };
  const observer = new MutationObserver((records) => {
    const changed = records.some((record) => {
      if (owned(record.target) || isInternalMutation(record)) return false;
      if (record.type !== 'childList') return true;
      return [...record.addedNodes, ...record.removedNodes].some((node) => !owned(node));
    });
    if (changed) schedule();
  });
  observer.observe(doc.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['href', 'aria-label', 'aria-busy', 'lang'],
  });
  let lastUrl = win.location.href;
  // History changes made in Airbnb's main world do not reliably emit popstate.
  const interval = setInterval(() => {
    if (win.location.href !== lastUrl) {
      lastUrl = win.location.href;
      schedule();
    }
  }, 500);
  win.addEventListener('popstate', schedule);
  refresh();
  return () => {
    observer.disconnect();
    clearTimeout(timer);
    clearInterval(interval);
    win.removeEventListener('popstate', schedule);
  };
}
