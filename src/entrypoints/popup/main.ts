import { browser } from 'wxt/browser';
import './style.css';

const toggle = document.querySelector<HTMLInputElement>('#enabled')!;
const mode = document.querySelector<HTMLSelectElement>('#price-mode')!;
const status = document.querySelector<HTMLElement>('#status')!;
const showStatus = () => {
  status.textContent = toggle.checked
    ? 'On for supported Airbnb pages.'
    : 'Paused. Original prices are still visible.';
};
async function init() {
  try {
    const stored = await browser.storage.local.get(['enabled', 'priceMode']);
    toggle.checked = stored.enabled !== false;
    mode.value = stored.priceMode === 'person' ? 'person' : 'total';
    toggle.disabled = false;
    showStatus();
  } catch {
    status.textContent = 'Could not load settings. Close and reopen this popup.';
  }
}
toggle.addEventListener('change', async () => {
  toggle.disabled = true;
  try {
    await browser.storage.local.set({ enabled: toggle.checked });
    showStatus();
  } catch {
    toggle.checked = !toggle.checked;
    status.textContent = 'Could not save. Please try again.';
  } finally {
    toggle.disabled = false;
  }
});
void init();

mode.addEventListener('change', async () => {
  try {
    await browser.storage.local.set({ priceMode: mode.value });
    showStatus();
  } catch {
    status.textContent = 'Could not save price display. Please try again.';
  }
});
