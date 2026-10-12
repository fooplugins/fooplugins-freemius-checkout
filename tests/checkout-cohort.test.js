'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  MemoryStorage, createRuntime, openCheckout, events, snapshot, assertReconciled
} = require('./checkout-lifecycle.test.js');

const NOW = 1800000000000;
const TTL = 30 * 60 * 1000;
const PREFIX = 'fooplugins_freemius_checkout:';
const COMPARE = '/foogallery-wordpress-gallery-plugin/compare-plans/';
const PRICING = [
  '/foogallery-wordpress-gallery-plugin/', '/foobox/',
  '/foobar-wordpress-notification-bars/', '/fooconvert/',
  '/foopass-bundle/', '/bundles/'
];
const ADDONS = [
  '/foogallery-wordpress-gallery-plugin/user-uploads/',
  '/foogallery-wordpress-gallery-plugin/social/',
  '/foogallery-wordpress-gallery-plugin/whitelabel/',
  '/foogallery-wordpress-gallery-plugin/client-proofing/'
];
const SOURCE_KEYS = ['source_context_version', 'source_page', 'source_cohort', 'source_created_at'];
const IDENTITY_KEYS = ['attempt_id', 'checkout_id', ...SOURCE_KEYS];
const CTA = ['product_pricing_card', 'product_pricing_sticky', 'compare_hero', 'compare_table',
  'compare_plan_section', 'trial', 'plan_advisor_result', 'other'];

function source(detail) {
  return Object.fromEntries(SOURCE_KEYS.map((key) => [key, detail[key]]));
}
function identity(detail) {
  return Object.fromEntries(IDENTITY_KEYS.map((key) => [key, detail[key]]));
}
function attempt(runtime, index = 0) {
  return events(runtime, 'fooplugins_checkout_attempt')[index].detail;
}
function expected(page, cohort) {
  return { source_context_version: 2, source_page: page, source_cohort: cohort, source_created_at: NOW };
}
function paid(extra = {}) {
  return { purchase: { id: 123456, initial_amount: 100, currency: 'USD', licenses: 3, ...extra } };
}
function assertLinked(runtime, original) {
  for (const record of runtime.records) {
    assert.deepEqual(identity(record.detail), identity(original), record.name);
  }
}
async function purchaseFixture(options = {}) {
  const runtime = createRuntime({ now: NOW, url: `https://example.test${COMPARE}`, ...options });
  const callbacks = await openCheckout(runtime);
  callbacks.purchaseCompleted(paid());
  callbacks.success({ purchase: { id: 123456 } });
  const confirmed = events(runtime, 'freemius_purchase_confirmed')[0].detail;
  return { runtime, callbacks, confirmed, key: PREFIX + confirmed.checkout_id };
}

// These tests run the actual producer in a VM and invoke the callbacks supplied to FS.Checkout.open().
// No private-method exports, rewritten producer source, simulated purchases, or live checkout requests.
test('closed page/CTA matrix uses real initiation path, not a compare CTA alone', async () => {
  const cases = [
    [COMPARE, COMPARE, 'compare_plans'],
    ...PRICING.map((page) => [page, page, 'product_pricing']),
    ...ADDONS.map((page) => [page, page, 'addon']),
    ['/documentation/', '/documentation/', 'documentation'],
    ['/documentation/customer@example.test/private-token/?email=private#token', '/documentation/', 'documentation'],
    ['/pricing/', 'unknown', 'unknown'],
    ['/foobox', 'unknown', 'unknown'],
    ['/foobox/customer@example.test/', 'unknown', 'unknown'],
    ['/FOOBOX/', 'unknown', 'unknown'],
    ['/foogallery-wordpress-gallery-plugin/%63ompare-plans/', 'unknown', 'unknown'],
    ['/documentation-secret/private/', 'unknown', 'unknown'],
    ['/documentation', 'unknown', 'unknown'],
    ['/private/?source_page=' + encodeURIComponent(COMPARE) + '&source_cohort=compare_plans#' + COMPARE, 'unknown', 'unknown']
  ];
  for (const [path, page, baseCohort] of cases) {
    for (const cta of CTA) {
      const runtime = createRuntime({ now: NOW, url: `https://example.test${path}` });
      await openCheckout(runtime, '', cta);
      const cohort = cta === 'trial' ? 'trial' : cta === 'plan_advisor_result' ? 'plan_advisor' : baseCohort;
      assert.deepEqual(source(attempt(runtime)), expected(page, cohort), `${path} / ${cta}`);
    }
  }
});

test('uncontrolled/coercive CTA values cannot leak data or execute coercion', async () => {
  for (const cta of ['person@example.test', 'compare_table?email=person@example.test', null, 123,
    { toString() { throw new Error('must not coerce private CTA'); } }, ['trial']]) {
    const runtime = createRuntime({ now: NOW, url: 'https://example.test/private/person@example.test/' });
    await openCheckout(runtime, '', cta);
    assert.equal(attempt(runtime).cta_location, 'other');
    assert.deepEqual(source(attempt(runtime)), expected('unknown', 'unknown'));
    assert.doesNotMatch(JSON.stringify(runtime.records), /person@example/);
  }
});

test('immutable identity survives visible open, raw track, hostile callback fields, navigation and generated redirect', async () => {
  const runtime = createRuntime({ now: NOW, url: `https://example.test${COMPARE}?email=person@example.test#secret` });
  const callbacks = await openCheckout(runtime, 'licenses/3/?email=person@example.test&source_cohort=trial');
  const original = attempt(runtime);
  assert.deepEqual(source(original), expected(COMPARE, 'compare_plans'));
  runtime.showCheckout();
  assert.equal(events(runtime, 'fooplugins_checkout_opened').length, 1);
  assert.equal(events(runtime, 'freemius_checkout_opened').length, 1);
  runtime.navigate('https://example.test/documentation/private-customer-token/?source_cohort=trial');
  runtime.advance(10000);
  const hostile = {
    source_context_version: 999, source_page: '/private/person@example.test/',
    source_cohort: 'trial', source_created_at: NOW + 10000,
    attempt_id: 'stolen', checkout_id: 'stolen', transaction_id: 'stolen',
    email: 'person@example.test', name: 'Jane Private', token: 'private-token',
    address: { personal: 'private-token' }, url: 'https://private.test/person@example.test',
    licenses: 3, currency: 'USD', billing_cycle: 'annual'
  };
  callbacks.track('review-order', { ...hostile, purchase: hostile });
  callbacks.track('complete', hostile);
  callbacks.purchaseCompleted({ ...hostile, purchase: { ...hostile, ...paid().purchase } });
  callbacks.purchaseCompleted(paid({ id: 999999 }));
  callbacks.success({ ...hostile, purchase: { id: 123456 } });
  const redirect = runtime.href;
  callbacks.success(paid());
  assert.equal(runtime.href, redirect);
  assert.equal(events(runtime, 'freemius_purchase_confirmed').length, 1);
  assert.equal(events(runtime, 'freemius_checkout_success').length, 1);
  const confirmed = events(runtime, 'freemius_purchase_confirmed')[0].detail;
  assert.equal(confirmed.transaction_id, '123456');
  assertReconciled(confirmed);
  assertLinked(runtime, original);
  assert.doesNotMatch(JSON.stringify(runtime.records), /person@example|Jane Private|private-token|private\.test/);
  const params = new URL(redirect).searchParams;
  assert.deepEqual([...params.keys()].sort(), ['fs_checkout_id', 'fs_plan', 'fs_product', 'fs_transaction']);
  assert.equal(params.get('fs_checkout_id'), original.checkout_id);
  const thankYou = createRuntime({ now: NOW + 20000, url: redirect, storage: runtime.storage });
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1);
  assertLinked(thankYou, original);
  const reload = createRuntime({ now: NOW + 20001, url: redirect, storage: runtime.storage });
  assert.equal(events(reload, 'freemius_purchase_thank_you_viewed').length, 0);
});

test('all allowed source cohorts round-trip through validated same-session purchase reconstruction', async () => {
  for (const [page, cta] of [
    [COMPARE, 'compare_table'], [PRICING[0], 'plan_advisor_result'], [PRICING[1], 'other'],
    [ADDONS[0], 'other'], ['/documentation/nested/private/', 'other'],
    ['/private/', 'trial'], ['/private/', 'compare_hero']
  ]) {
    const runtime = createRuntime({ now: NOW, url: `https://example.test${page}` });
    const callbacks = await openCheckout(runtime, '', cta);
    callbacks.success(paid());
    callbacks.purchaseCompleted({});
    callbacks.purchaseCompleted(paid());
    callbacks.success(paid());
    assert.equal(events(runtime, 'freemius_purchase_confirmed').length, 1);
    assert.equal(events(runtime, 'freemius_checkout_success').length, 1);
    assertLinked(runtime, attempt(runtime));
    const thankYou = createRuntime({ now: NOW + 1, url: runtime.href, storage: runtime.storage });
    assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1, page);
    assertLinked(thankYou, attempt(runtime));
  }
});

test('cancelled reopen and new click create new IDs/source; late callbacks remain linked to their own initiation', async () => {
  const runtime = createRuntime({ now: NOW, url: `https://example.test${COMPARE}` });
  const first = await openCheckout(runtime);
  const firstAttempt = attempt(runtime);
  // A second activation while opening is coalesced, not a new initiating action.
  await openCheckout(runtime);
  assert.equal(runtime.openCount, 1);
  assert.equal(events(runtime, 'fooplugins_checkout_attempt').length, 1);
  runtime.navigate('https://example.test/foobox/');
  runtime.advance(1000);
  first.cancel();
  first.cancel();
  assert.equal(events(runtime, 'fooplugins_checkout_cancelled').length, 1);
  assert.deepEqual(identity(events(runtime, 'fooplugins_checkout_cancelled')[0].detail), identity(firstAttempt));
  const second = await openCheckout(runtime, '', 'plan_advisor_result');
  const secondAttempt = attempt(runtime, 1);
  assert.notEqual(firstAttempt.attempt_id, secondAttempt.attempt_id);
  assert.notEqual(firstAttempt.checkout_id, secondAttempt.checkout_id);
  assert.equal(secondAttempt.source_created_at, NOW + 1000);
  assert.equal(secondAttempt.source_page, '/foobox/');
  assert.equal(secondAttempt.source_cohort, 'plan_advisor');
  first.track('load', { source_page: '/foobox/', attempt_id: secondAttempt.attempt_id });
  assert.deepEqual(identity(events(runtime, 'freemius_checkout_load')[0].detail), identity(firstAttempt));
  first.cancel();
  second.success(paid({ id: 222222 }));
  assert.deepEqual(identity(events(runtime, 'freemius_checkout_success')[0].detail), identity(secondAttempt));
  runtime.advance(1000);
  runtime.navigate('https://example.test/bundles/');
  await openCheckout(runtime);
  const thirdAttempt = attempt(runtime, 2);
  assert.notEqual(thirdAttempt.attempt_id, secondAttempt.attempt_id);
  assert.notEqual(thirdAttempt.checkout_id, secondAttempt.checkout_id);
  assert.deepEqual(source(thirdAttempt), { ...expected('/bundles/', 'product_pricing'), source_created_at: NOW + 2000 });
});

test('render failure and retry retain the first source then capture a fresh action', async () => {
  const runtime = createRuntime({ now: NOW, url: `https://example.test${COMPARE}` });
  await openCheckout(runtime, '?email=person@example.test');
  const original = attempt(runtime);
  runtime.navigate('https://example.test/foobox/');
  runtime.advance(100);
  runtime.expireOpen();
  const failed = events(runtime, 'fooplugins_checkout_open_failed');
  assert.equal(failed.length, 1);
  assert.deepEqual(identity(failed[0].detail), identity(original));
  assert.match(runtime.href, /^https:\/\/checkout\.freemius\.com\//);
  assert.equal(new URL(runtime.href).searchParams.get('email'), 'person@example.test', 'Hosted fallback remains exact.');
  assert.doesNotMatch(JSON.stringify(failed), /person@example/);
  runtime.navigate('https://example.test/foobox/');
  await openCheckout(runtime);
  assert.notEqual(attempt(runtime, 1).attempt_id, original.attempt_id);
  assert.equal(attempt(runtime, 1).source_page, '/foobox/');
});

test('TTL accepts exactly 30 minutes, rejects expiration/future, and never refreshes source on confirmation', async () => {
  for (const [elapsed, count] of [[0, 1], [TTL - 1, 1], [TTL, 1], [TTL + 1, 0], [-1, 0]]) {
    const { runtime, confirmed } = await purchaseFixture();
    const thankYou = createRuntime({ now: NOW + elapsed, url: runtime.href, storage: runtime.storage });
    assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, count, `elapsed=${elapsed}`);
    assert.equal(confirmed.source_created_at, NOW);
  }
  const runtime = createRuntime({ now: NOW, url: `https://example.test${COMPARE}` });
  const callbacks = await openCheckout(runtime);
  runtime.advance(TTL + 1);
  callbacks.purchaseCompleted(paid());
  callbacks.success({});
  assert.equal(events(runtime, 'freemius_purchase_confirmed')[0].detail.source_created_at, NOW);
  const thankYou = createRuntime({ now: runtime.now, url: runtime.href, storage: runtime.storage });
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 0);
});

test('absent/corrupt/version-mismatched/PII/contradictory source storage fails closed without query repair', async () => {
  const mutations = [
    ...SOURCE_KEYS.map((key) => [(value) => { delete value[key]; }, `missing ${key}`]),
    [(value) => { value.source_context_version = 1; }, 'old version'],
    [(value) => { value.source_context_version = '2'; }, 'coercive version'],
    [(value) => { value.source_cohort = 'free-text-private-token'; }, 'unknown cohort'],
    [(value) => { value.source_page = '/foobox/private-person@example.test/'; }, 'unknown page'],
    [(value) => { value.source_page = '/documentation/person@example.test/'; }, 'uncollapsed docs'],
    [(value) => { value.source_cohort = 'product_pricing'; }, 'contradictory compare cohort'],
    [(value) => { value.source_page = '/foobox/'; }, 'compare cohort on pricing path'],
    [(value) => { value.source_created_at = String(NOW); }, 'string timestamp'],
    [(value) => { value.source_created_at = NOW + 0.5; }, 'fractional timestamp'],
    [(value) => { value.source_created_at = -1; }, 'negative timestamp'],
    [(value) => { value.source_created_at = Number.MAX_SAFE_INTEGER + 1; }, 'unsafe timestamp'],
    [(value) => { value.source_created_at = null; }, 'null timestamp'],
    [(value) => { value.source_page = { email: 'person@example.test' }; }, 'object page'],
    [(value) => { value.source_cohort = ['compare_plans']; }, 'array cohort'],
    [(value) => { value.email = 'person@example.test'; }, 'arbitrary top-level PII'],
    [(value) => { value.items[0].token = 'private-token'; }, 'arbitrary nested PII'],
    [(value) => { value.source = { source_page: COMPARE }; }, 'unversioned nested alias']
  ];
  for (const [mutate, label] of mutations) {
    const { runtime, confirmed, key } = await purchaseFixture();
    const corrupt = snapshot(confirmed);
    mutate(corrupt);
    runtime.storage.setItem(key, JSON.stringify(corrupt));
    const url = runtime.href + '&source_context_version=2&source_created_at=' + NOW + '&source_cohort=compare_plans&source_page=' + encodeURIComponent(COMPARE);
    const thankYou = createRuntime({ now: NOW, url, storage: runtime.storage });
    assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 0, label);
  }
  for (const raw of [null, '', '{broken', '[]', 'null']) {
    const { runtime, key } = await purchaseFixture();
    if (raw === null) runtime.storage.entries.delete(key);
    else runtime.storage.setItem(key, raw);
    const thankYou = createRuntime({ now: NOW, url: runtime.href, storage: runtime.storage });
    assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 0, String(raw));
  }
});

test('non-producer-shaped stored identity cannot leak arbitrary alphanumeric data', async () => {
  for (const [field, value] of [['attempt_id', 'JaneDoe'], ['checkout_id', 'JohnSmith']]) {
    const { runtime, confirmed, key } = await purchaseFixture();
    const corrupt = snapshot(confirmed); corrupt[field] = value;
    const changedKey = PREFIX + corrupt.checkout_id;
    runtime.storage.setItem(changedKey, JSON.stringify(corrupt));
    const url = new URL(runtime.href); url.searchParams.set('fs_checkout_id', corrupt.checkout_id);
    const thanks = createRuntime({ now: NOW, url: url.toString(), storage: runtime.storage });
    assert.equal(events(thanks, 'freemius_purchase_thank_you_viewed').length, 0, field);
  }
});

test('direct/spoofed URL and wrong navigation cannot invent source or purchase', async () => {
  const { runtime } = await purchaseFixture();
  const direct = createRuntime({ now: NOW, url: runtime.href, storage: new MemoryStorage() });
  assert.equal(direct.records.length, 0);
  for (const mutate of [
    (url) => { url.pathname = COMPARE; },
    (url) => { url.searchParams.set('fs_transaction', '999999'); },
    (url) => { url.searchParams.set('fs_checkout_id', 'made-up'); },
    (url) => { url.searchParams.set('fs_plan', 'made-up'); },
    (url) => { url.searchParams.set('fs_product', 'made-up'); }
  ]) {
    const url = new URL(runtime.href);
    mutate(url);
    const spoof = createRuntime({ now: NOW, url: url.toString(), storage: runtime.storage });
    assert.equal(spoof.records.length, 0);
  }
});

test('blocked storage or analytics must not break modal, validated payment, or redirect', async () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const { runtime, confirmed } = await purchaseFixture({ storage: blocked });
  assert.deepEqual(source(confirmed), expected(COMPARE, 'compare_plans'));
  assert.match(runtime.href, /fs_transaction=123456/);
  const thankYou = createRuntime({ now: NOW, url: runtime.href, storage: blocked });
  assert.equal(thankYou.records.length, 0);
  const analytics = createRuntime({ now: NOW, url: `https://example.test${COMPARE}` });
  analytics.document.addEventListener('freemius_purchase_confirmed', () => { throw new Error('analytics blocked'); });
  const callbacks = await openCheckout(analytics);
  callbacks.purchaseCompleted(paid());
  callbacks.success({});
  assert.match(analytics.href, /fs_transaction=123456/);
});

test('denied storage accessor cannot interrupt purchase callbacks or redirect; denied dedup write suppresses reconstruction', async () => {
  const { runtime, confirmed } = await purchaseFixture({ blockedStorageAccess: true });
  assert.deepEqual(source(confirmed), expected(COMPARE, 'compare_plans'));
  assert.match(runtime.href, /fs_transaction=123456/);
  const denied = createRuntime({ now: NOW, url: runtime.href, blockedStorageAccess: true });
  assert.equal(denied.records.length, 0);
  const valid = await purchaseFixture();
  const readOnly = {
    getItem(key) { return valid.runtime.storage.getItem(key); },
    setItem() { throw new Error('storage write denied'); }
  };
  const thankYou = createRuntime({ now: NOW, url: valid.runtime.href, storage: readOnly });
  assert.equal(thankYou.records.length, 0, 'Reconstruction must not emit an undeduplicated event.');
});

test('trial and multi-license payment truth remain distinct from source cohort', async () => {
  const runtime = createRuntime({ now: NOW, url: `https://example.test${COMPARE}` });
  const callbacks = await openCheckout(runtime, 'licenses/5/?trial=free', 'trial');
  callbacks.success(paid({ licenses: 5, trial_ends: '2027-01-01T00:00:00Z' }));
  callbacks.purchaseCompleted({});
  const confirmed = events(runtime, 'freemius_purchase_confirmed')[0].detail;
  assert.equal(confirmed.value, 0);
  assert.equal(confirmed.quantity, 5);
  assert.equal(confirmed.source_cohort, 'trial');
  assertReconciled(confirmed);
  const thankYou = createRuntime({ now: NOW, url: runtime.href, storage: runtime.storage });
  assertLinked(thankYou, attempt(runtime));
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1);
  // CTA cohort is not itself proof that a transaction is a trial.
  const paidRuntime = createRuntime({ now: NOW, url: 'https://example.test/foobox/' });
  const paidCallbacks = await openCheckout(paidRuntime, '', 'trial');
  paidCallbacks.purchaseCompleted(paid());
  assert.equal(events(paidRuntime, 'freemius_purchase_confirmed')[0].detail.value, 100);
});
