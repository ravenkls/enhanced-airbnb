import { annotationTag, type PriceSource } from '../airbnb/adapter';
import { calculate } from '../domain/pricing';
import type { AnnotationRenderer } from '../ui/annotation';

export interface Enhancer {
  refresh(): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

export function createEnhancer(
  doc: Document,
  getUrl: () => URL,
  source: PriceSource,
  renderer: AnnotationRenderer,
): Enhancer {
  const rendered = new Map<HTMLElement, { host: HTMLElement; signature: string }>();
  let enabled = true;
  const clear = () => {
    rendered.forEach(({ host }) => host.remove());
    rendered.clear();
  };
  const refresh = () => {
    if (!enabled) return;
    const active = new Set<HTMLElement>();
    const locale = doc.documentElement.lang || 'en';
    for (const target of source.read(doc, getUrl())) {
      const breakdown = calculate(target.price, target.context);
      if (
        !breakdown ||
        !target.element.isConnected ||
        target.element.closest('[hidden], [aria-busy="true"]')
      )
        continue;
      active.add(target.element);
      const signature = JSON.stringify([target.price, breakdown, target.surface, locale]);
      const previous = rendered.get(target.element);
      if (previous?.signature === signature && previous.host.isConnected) continue;
      previous?.host.remove();
      const host = renderer.render(target, breakdown, locale);
      // Append only our own node. Existing price nodes, links and event handlers are untouched.
      target.element.append(host);
      rendered.set(target.element, { host, signature });
    }
    for (const [element, { host }] of rendered) {
      if (!active.has(element)) {
        host.remove();
        rendered.delete(element);
      }
    }
  };
  return {
    refresh,
    setEnabled(value) {
      enabled = value;
      if (value) refresh();
      else clear();
    },
    destroy: clear,
  };
}

const owned = (node: Node): boolean => {
  const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return !!element?.closest(annotationTag);
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
      if (owned(record.target)) return false;
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
