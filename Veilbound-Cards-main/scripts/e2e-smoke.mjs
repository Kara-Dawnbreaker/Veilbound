import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  desktop.on('pageerror', (error) => failures.push(error.message));

  const response = await desktop.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'production page should load successfully');
  await desktop.getByRole('heading', { name: 'Veilbound: Ashen Crown' }).waitFor();
  await desktop.getByRole('button', { name: 'Begin Expedition' }).click();
  await desktop.getByRole('heading', { name: 'Prepare Expedition' }).waitFor();
  await desktop.getByRole('button', { name: 'Embark on Expedition' }).click();
  await desktop.getByText(/Nodes Cleared:/).waitFor();

  const reachableNodes = desktop.locator('button[aria-label$="(Reachable)"]');
  assert.ok(await reachableNodes.count() > 0, 'the generated map should expose at least one reachable node');

  // A refresh returns to the menu, but the active run must remain resumable.
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.getByRole('button', { name: 'Resume Run' }).waitFor();
  await desktop.getByRole('button', { name: 'Resume Run' }).click();
  await desktop.getByText(/Nodes Cleared:/).waitFor();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('pageerror', (error) => failures.push(error.message));
  await mobile.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await mobile.getByRole('heading', { name: 'Veilbound: Ashen Crown' }).waitFor();
  const mobileOverflow = await mobile.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert.equal(mobileOverflow, false, 'main menu should not overflow horizontally on a phone-sized viewport');
  await mobile.getByRole('button', { name: 'Begin Expedition' }).click();
  await mobile.getByRole('heading', { name: 'Prepare Expedition' }).waitFor();
  const selectionOverflow = await mobile.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert.equal(selectionOverflow, false, 'character selection should not overflow horizontally on a phone-sized viewport');

  assert.deepEqual(failures, [], 'the app should not throw uncaught browser errors during the smoke flow');
  console.log('Browser smoke test passed: desktop start/resume, mobile menu/selection, no uncaught page errors.');
} finally {
  await browser.close();
}
