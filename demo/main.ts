import { airbnbSource } from '../src/airbnb/adapter';
import { createEnhancer, observePage } from '../src/application/enhancer';
import { annotationRenderer } from '../src/ui/annotation';
const guests = document.querySelector<HTMLInputElement>('#guests')!;
const nights = document.querySelector<HTMLInputElement>('#nights')!;
const enhancer = createEnhancer(
  document,
  () =>
    new URL(
      `https://www.airbnb.co.uk/s/homes?adults=${guests.value}&checkin=2026-11-01&checkout=2026-11-${String(Number(nights.value) + 1).padStart(2, '0')}`,
    ),
  airbnbSource,
  annotationRenderer,
);
observePage(document, enhancer.refresh);
guests.addEventListener('input', enhancer.refresh);
nights.addEventListener('input', enhancer.refresh);
document
  .querySelector<HTMLInputElement>('#enabled')!
  .addEventListener('change', (event) =>
    enhancer.setEnabled((event.target as HTMLInputElement).checked),
  );
document.querySelector('#discount')!.addEventListener('click', () => {
  document.querySelector('#list-price')!.textContent = '£960 total';
  document.querySelector('#detail-price')!.textContent = '£960 total';
  document.querySelector('#map-price')!.textContent = '£960';
});
