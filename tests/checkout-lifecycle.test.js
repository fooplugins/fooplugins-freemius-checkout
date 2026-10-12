'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const producerSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'fooplugins-freemius.js'),
  'utf8'
);

class MemoryStorage {
  constructor(entries) {
    this.entries = entries || new Map();
  }

  getItem(key) {
    return this.entries.has(key) ? this.entries.get(key) : null;
  }

  setItem(key, value) {
    this.entries.set(String(key), String(value));
  }
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntime(options = {}) {
  const records = [];
  const listeners = new Map();
  const storage = options.storage || new MemoryStorage();
  let currentHref = options.url || 'https://example.test/pricing/';
  let checkoutOptions = null;
  let uuidCounter = 0;
  let timerCounter = 0;
  let now = options.now === undefined ? Date.now() : options.now;
  let frames = [];
  let openCount = 0;
  const intervals = new Map();
  const timeouts = new Map();
  class RuntimeDate extends Date {
    static now() { return now; }
  }

  class FakeCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init.detail;
      this.bubbles = init.bubbles;
    }
  }

  const document = {
    readyState: 'complete',
    documentElement: {},
    head: { appendChild() {} },
    body: { appendChild() {} },
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    dispatchEvent(event) {
      records.push({ name: event.type, detail: snapshot(event.detail) });
      (listeners.get(event.type) || []).forEach((callback) => callback(event));
      return true;
    },
    querySelectorAll(selector) {
      return selector.startsWith('iframe[') ? frames : [];
    },
    querySelector() {
      return null;
    },
    createElement() {
      return {};
    }
  };

  const location = {
    get href() {
      return currentHref;
    },
    set href(value) {
      currentHref = new URL(value, currentHref).toString();
    },
    get search() {
      return new URL(currentHref).search;
    },
    assign(value) {
      currentHref = new URL(value, currentHref).toString();
    }
  };

  class Checkout {
    constructor(config) {
      this.config = config;
    }

    open(nextCheckoutOptions) {
      checkoutOptions = nextCheckoutOptions;
      openCount += 1;
      return options.rejectOpen ? false : true;
    }
  }

  const config = {
    plugins: [
      {
        product_id: 843,
        public_key: 'pk_test_public',
        product_name: 'FooGallery',
        product_slug: 'foogallery',
        default_plan: 'pro',
        plans: { 13794: 'pro-starter' }
      }
    ],
    success_url: 'https://example.test/purchase-thanks/',
    affiliation: 'FooPlugins',
    checkout_defaults: {}
  };

  const window = {
    FOOCHECKOUT: config,
    FS: { Checkout },
    location,
    document,
    sessionStorage: storage,
    CustomEvent: FakeCustomEvent,
    URL,
    URLSearchParams,
    console,
    crypto: {
      randomUUID() {
        uuidCounter += 1;
        return `00000000-0000-4000-8000-${uuidCounter.toString(16).padStart(12, '0')}`;
      }
    },
    performance: { now: () => 100 },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    setTimeout(callback, delay) {
      timerCounter += 1;
      timeouts.set(timerCounter, { callback, delay });
      return timerCounter;
    },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(callback) {
      timerCounter += 1;
      intervals.set(timerCounter, callback);
      return timerCounter;
    },
    clearInterval(id) { intervals.delete(id); },
    addEventListener() {}
  };
  window.window = window;

  const sandbox = {
    window,
    document,
    location,
    sessionStorage: storage,
    CustomEvent: FakeCustomEvent,
    URL,
    URLSearchParams,
    console,
    Date: RuntimeDate,
    crypto: window.crypto,
    performance: window.performance,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    MutationObserver: undefined
  };

  if (options.blockedStorageAccess) {
    for (const target of [window, sandbox]) {
      Object.defineProperty(target, 'sessionStorage', {
        get() { throw new Error('storage access denied'); }
      });
    }
  }
  vm.runInNewContext(producerSource, sandbox, { filename: 'js/fooplugins-freemius.js' });

  return {
    FooCheckout: window.FooCheckout,
    records,
    storage,
    document,
    navigate(url) { location.href = url; },
    advance(ms) { now += ms; },
    get now() { return now; },
    get openCount() { return openCount; },
    showCheckout() {
      frames = [{
        src: 'https://checkout.freemius.com/fixture/',
        getAttribute(name) { return name === 'src' ? this.src : null; },
        getBoundingClientRect() { return { width: 800, height: 600 }; }
      }];
      [...intervals.values()].forEach((callback) => callback());
    },
    expireOpen() {
      [...timeouts.values()].filter(({ delay }) => delay >= 100).forEach(({ callback }) => callback());
    },
    get href() {
      return currentHref;
    },
    get checkoutOptions() {
      return checkoutOptions;
    }
  };
}

async function openCheckout(runtime, suffix, ctaLocation = 'product_pricing_card') {
  const accepted = runtime.FooCheckout.open({
    tagName: 'A',
    href: `https://checkout.freemius.com/plugin/843/plan/13794/${suffix || ''}`,
    dataset: { checkoutLocation: ctaLocation }
  });
  assert.equal(accepted, true, 'The real producer must accept the fixture checkout URL.');
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(runtime.checkoutOptions, 'The real producer must provide Freemius callbacks to Checkout.open().');
  return runtime.checkoutOptions;
}

function events(runtime, name) {
  return runtime.records.filter((record) => record.name === name);
}

function assertReconciled(detail) {
  assert.equal(detail.items.length, 1);
  assert.equal(detail.items[0].quantity, detail.quantity);
  assert.equal(
    Math.round(detail.items[0].price * detail.items[0].quantity * 100),
    Math.round(detail.value * 100),
    'Item unit price multiplied by quantity must reconcile to top-level value at strict cent rounding.'
  );
}

async function testCompletePartialAndThankYouLifecycle() {
  const runtime = createRuntime();
  const callbacks = await openCheckout(runtime);
  callbacks.track('review-order', { currency: 'usd' });
  callbacks.track('complete', { currency: 'usd' });

  const completeResponse = {
    purchase: {
      id: 123456,
      initial_amount: 49,
      gross: 59,
      currency: 'usd',
      licenses: 1,
      plan_id: 13794,
      coupon_id: 'SAVE20'
    }
  };
  callbacks.purchaseCompleted(completeResponse);
  callbacks.success({ status: 'complete-without-repeated-purchase' });

  assert.equal(events(runtime, 'freemius_checkout_complete').length, 1, 'Complete tracking must remain available.');
  assert.equal(events(runtime, 'freemius_purchase_confirmed').length, 1, 'A complete purchase must emit one confirmation.');
  assert.equal(events(runtime, 'freemius_checkout_success').length, 1, 'A partial success callback must reuse prior validated commerce context.');

  const confirmed = events(runtime, 'freemius_purchase_confirmed')[0].detail;
  assert.equal(confirmed.value, 49, 'initial_amount is the total transaction amount.');
  assert.equal(confirmed.price, 49, 'Single-license unit price equals total value.');
  assertReconciled(confirmed);
  assert.match(runtime.href, /fs_transaction=123456/);

  const thankYou = createRuntime({ url: runtime.href, storage: runtime.storage });
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1, 'Validated redirect context must emit one thank-you marker.');
  thankYou.FooCheckout.init();
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1, 'Thank-you marker must remain idempotent on repeated initialization.');
}

async function testMultiLicenseReorderedAndDuplicateCallbacks() {
  const runtime = createRuntime();
  const callbacks = await openCheckout(runtime, 'licenses/3/');
  const response = {
    purchase: {
      id: 987654,
      initial_amount: 100,
      currency: 'EUR',
      licenses: 3,
      plan: { id: 13794 }
    }
  };

  callbacks.success(response);
  callbacks.purchaseCompleted({ status: 'partial-after-success' });
  callbacks.purchaseCompleted(response);
  callbacks.success(response);

  assert.equal(events(runtime, 'freemius_purchase_confirmed').length, 1, 'Duplicate/reordered purchaseCompleted callbacks must emit one confirmation.');
  assert.equal(events(runtime, 'freemius_checkout_success').length, 1, 'Duplicate success callbacks must emit one success lifecycle event.');

  const confirmed = events(runtime, 'freemius_purchase_confirmed')[0].detail;
  assert.equal(confirmed.value, 100, 'Multi-license top-level value is the total transaction amount.');
  assert.equal(confirmed.quantity, 3);
  assert.notEqual(confirmed.items[0].price, confirmed.value, 'Multi-license item price must be a unit price, not the transaction total.');
  assertReconciled(confirmed);

  const thankYou = createRuntime({ url: runtime.href, storage: runtime.storage });
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1, 'Reordered callbacks must still produce one thank-you marker.');
}

async function testStoredThankYouContextIsStrictlyRevalidated() {
  const mutations = [
    {
      label: 'nested stored coupon PII',
      mutate(stored) {
        stored.coupon = { buyer_email: 'opaque-synthetic-buyer@example.test' };
      }
    },
    {
      label: 'nested stored billing-cycle PII',
      mutate(stored) {
        stored.billing_cycle = { buyer_email: 'opaque-synthetic-buyer@example.test' };
      }
    },
    {
      label: 'unexpected stored buyer field',
      mutate(stored) {
        stored.buyer_email = 'stale@example.test';
      }
    },
    {
      label: 'product metadata contradicting plugin configuration',
      mutate(stored) {
        stored.product_name = 'Manipulated Product';
      }
    },
    {
      label: 'malformed stored commerce value',
      mutate(stored) {
        stored.value = 49.001;
      }
    }
  ];

  for (const fixture of mutations) {
    const runtime = createRuntime();
    const callbacks = await openCheckout(runtime);
    callbacks.purchaseCompleted({
      purchase: {
        id: 456789,
        initial_amount: 49,
        currency: 'USD',
        licenses: 1,
        plan_id: 13794
      }
    });
    callbacks.success({ status: 'complete-without-repeated-purchase' });

    const checkoutId = new URL(runtime.href).searchParams.get('fs_checkout_id');
    const storageKey = `fooplugins_freemius_checkout:${checkoutId}`;
    const stored = JSON.parse(runtime.storage.getItem(storageKey));
    fixture.mutate(stored);
    runtime.storage.setItem(storageKey, JSON.stringify(stored));

    const thankYou = createRuntime({ url: runtime.href, storage: runtime.storage });
    assert.equal(
      events(thankYou, 'freemius_purchase_thank_you_viewed').length,
      0,
      `${fixture.label} must fail closed before thank-you dispatch.`
    );
  }
}

async function testCouponContextRejectsPiiAndCoerciveValues() {
  const hostileCoupons = [
    { buyer_email: 'opaque-synthetic-buyer@example.test' },
    'opaque-synthetic-buyer@example.test',
    '+15551234567',
    '15551234567',
    'Renée Example'
  ];

  for (const coupon_id of hostileCoupons) {
    const runtime = createRuntime();
    const callbacks = await openCheckout(runtime);
    callbacks.track('coupon-added', { coupon: coupon_id });
    const couponEvent = events(runtime, 'freemius_checkout_coupon_added')[0];
    assert.equal(Object.hasOwn(couponEvent.detail, 'coupon'), false, 'Hostile tracked coupon data must be omitted from lifecycle dispatch.');
    callbacks.purchaseCompleted({
      purchase: { id: 987663, initial_amount: 49, currency: 'USD', licenses: 1, plan_id: 13794, coupon_id }
    });

    const confirmed = events(runtime, 'freemius_purchase_confirmed');
    assert.equal(confirmed.length, 1, 'Hostile optional coupon data must not suppress an otherwise valid purchase lifecycle.');
    assert.equal(Object.hasOwn(confirmed[0].detail, 'coupon'), false, 'Hostile optional coupon data must be omitted from dispatch.');
    const checkoutId = confirmed[0].detail.checkout_id;
    assert.equal(runtime.storage.getItem(`fooplugins_freemius_checkout:${checkoutId}`).includes('opaque-synthetic-buyer'), false, 'Hostile coupon PII must not reach storage.');
  }
}

async function testArbitraryTrackEventNameCannotLeakNestedData() {
  const runtime = createRuntime();
  const callbacks = await openCheckout(runtime);
  callbacks.track({ buyer_email: 'opaque-synthetic-buyer@example.test' }, {});
  callbacks.track({ toString() { return 'opaque-synthetic-buyer'; } }, {});
  assert.doesNotThrow(() => callbacks.track(Object.create(null), {}), 'A non-coercible track event must fail safe.');
  assert.equal(JSON.stringify(runtime.records).includes('opaque-synthetic-buyer'), false, 'An arbitrary track event value must not be copied into event detail.');
}

async function testAllControlledCtaLocationsSurviveThankYouRevalidation() {
  const locations = [
    'product_pricing_card',
    'product_pricing_sticky',
    'compare_hero',
    'compare_table',
    'compare_plan_section',
    'trial',
    'plan_advisor_result',
    'other'
  ];
  for (const [index, ctaLocation] of locations.entries()) {
    const runtime = createRuntime();
    const callbacks = await openCheckout(runtime, '', ctaLocation);
    callbacks.purchaseCompleted({ purchase: { id: 987700 + index, initial_amount: 49, currency: 'USD', licenses: 1, plan_id: 13794 } });
    callbacks.success({ status: 'complete-without-repeated-purchase' });
    const checkoutId = new URL(runtime.href).searchParams.get('fs_checkout_id');
    const thankYou = createRuntime({ storage: runtime.storage, url: runtime.href });
    const viewed = events(thankYou, 'freemius_purchase_thank_you_viewed');
    assert.equal(viewed.length, 1, `${ctaLocation} must survive stored purchase-context revalidation.`);
    assert.equal(viewed[0].detail.cta_location, ctaLocation, `${ctaLocation} attribution must remain exact.`);
  }
}

async function testDefaultPlanCheckoutRetainsThankYouLifecycle() {
  const runtime = createRuntime();
  const accepted = runtime.FooCheckout.open({
    tagName: 'A',
    href: 'https://checkout.freemius.com/plugin/843/',
    dataset: { checkoutLocation: 'product_pricing_card' }
  });
  assert.equal(accepted, true);
  await Promise.resolve();
  await Promise.resolve();
  const callbacks = runtime.checkoutOptions;
  const response = { purchase: { id: 987664, initial_amount: 49, currency: 'USD', licenses: 1 } };
  callbacks.purchaseCompleted(response);
  callbacks.success(response);
  assert.equal(events(runtime, 'freemius_purchase_confirmed').length, 1, 'A checkout without an explicit plan path must use the configured default plan.');
  const thankYou = createRuntime({ url: runtime.href, storage: runtime.storage });
  assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 1, 'A valid default-plan checkout must retain its thank-you lifecycle event.');
}

async function testTrialPurchaseUsesZeroTotalAndUnitPrice() {
  const runtime = createRuntime();
  const callbacks = await openCheckout(runtime, 'licenses/5/?trial=free');
  callbacks.purchaseCompleted({
    purchase: {
      id: 987655,
      initial_amount: 125,
      gross: 125,
      currency: 'GBP',
      licenses: 5,
      trial_ends: '2026-10-01T00:00:00Z'
    }
  });

  const confirmed = events(runtime, 'freemius_purchase_confirmed')[0].detail;
  assert.equal(confirmed.is_trial, true);
  assert.equal(confirmed.value, 0);
  assert.equal(confirmed.items[0].price, 0);
  assertReconciled(confirmed);
}

async function testFalseTrialEndsKeepsPaidPurchaseValue() {
  const runtime = createRuntime();
  const callbacks = await openCheckout(runtime);
  callbacks.purchaseCompleted({
    purchase: {
      id: 987661,
      initial_amount: 49,
      currency: 'USD',
      licenses: 1,
      trial_ends: false
    }
  });

  const confirmed = events(runtime, 'freemius_purchase_confirmed');
  assert.equal(confirmed.length, 1, 'A false trial_ends value must remain a paid purchase.');
  assert.equal(confirmed[0].detail.is_trial, false);
  assert.equal(confirmed[0].detail.value, 49, 'A false trial_ends value must not zero paid revenue.');
}

async function testContradictoryOrMalformedTrialStateFailsClosed() {
  const fixtures = [
    {
      label: 'paid checkout with a trial end timestamp',
      suffix: '',
      trialEnds: '2026-10-01T00:00:00Z'
    },
    {
      label: 'trial checkout without a trial end marker',
      suffix: '?trial=free'
    },
    {
      label: 'trial checkout with false trial end marker',
      suffix: '?trial=free',
      trialEnds: false
    },
    {
      label: 'trial checkout with malformed trial end timestamp',
      suffix: '?trial=free',
      trialEnds: 'not-a-date'
    },
    {
      label: 'trial checkout with impossible calendar timestamp',
      suffix: '?trial=free',
      trialEnds: '2026-02-31T00:00:00Z'
    }
  ];

  for (const fixture of fixtures) {
    const runtime = createRuntime();
    const callbacks = await openCheckout(runtime, fixture.suffix);
    const purchase = {
      id: 987662,
      initial_amount: 49,
      currency: 'USD',
      licenses: 1
    };
    if (Object.hasOwn(fixture, 'trialEnds')) purchase.trial_ends = fixture.trialEnds;
    callbacks.purchaseCompleted({ purchase });
    callbacks.success({ purchase });

    assert.equal(
      events(runtime, 'freemius_purchase_confirmed').length,
      0,
      `${fixture.label} must not emit purchase confirmation.`
    );
    assert.doesNotMatch(runtime.href, /fs_transaction=/, `${fixture.label} must not persist commerce redirect state.`);
  }
}

async function testInvalidCoerciveCommerceValuesFailClosed() {
  const invalidFixtures = [
    {
      label: 'non-numeric transaction identifier',
      purchase: { id: 'customer-name-15551234567', initial_amount: 49, currency: 'USD', licenses: 1 }
    },
    {
      label: 'zero transaction identifier',
      purchase: { id: 0, initial_amount: 49, currency: 'USD', licenses: 1 }
    },
    {
      label: 'whitespace-padded transaction identifier',
      purchase: { id: ' 987656 ', initial_amount: 49, currency: 'USD', licenses: 1 }
    },
    {
      label: 'numeric strings',
      purchase: { id: 987656, initial_amount: '49.00', currency: 'USD', licenses: 1 }
    },
    {
      label: 'fractional cents',
      purchase: { id: 987657, initial_amount: 49.999, currency: 'USD', licenses: 1 }
    },
    {
      label: 'invalid currency',
      purchase: { id: 987658, initial_amount: 49, currency: 'US$', licenses: 1 }
    },
    {
      label: 'coercive quantity',
      purchase: { id: 987659, initial_amount: 49, currency: 'USD', licenses: '2' }
    },
    {
      label: 'negative total',
      purchase: { id: 987660, initial_amount: -1, currency: 'USD', licenses: 1 }
    }
  ];

  for (const fixture of invalidFixtures) {
    const runtime = createRuntime();
    const callbacks = await openCheckout(runtime);
    callbacks.purchaseCompleted({ purchase: fixture.purchase });
    callbacks.success({ purchase: fixture.purchase });

    assert.equal(events(runtime, 'freemius_purchase_confirmed').length, 0, `${fixture.label} must not emit purchase confirmation.`);
    const success = events(runtime, 'freemius_checkout_success');
    assert.equal(success.length, 1, `${fixture.label} may retain a non-commerce success lifecycle marker.`);
    assert.equal(Object.hasOwn(success[0].detail, 'value'), false, `${fixture.label} must not manufacture a commerce value.`);
    assert.equal(Object.hasOwn(success[0].detail, 'items'), false, `${fixture.label} must not manufacture commerce items.`);
    assert.doesNotMatch(runtime.href, /fs_transaction=/, `${fixture.label} must not add an unvalidated transaction to redirect.`);

    const thankYou = createRuntime({ url: runtime.href, storage: runtime.storage });
    assert.equal(events(thankYou, 'freemius_purchase_thank_you_viewed').length, 0, `${fixture.label} must not create a thank-you commerce marker.`);
  }
}

async function main() {
  const tests = [
    testCompletePartialAndThankYouLifecycle,
    testMultiLicenseReorderedAndDuplicateCallbacks,
    testStoredThankYouContextIsStrictlyRevalidated,
    testCouponContextRejectsPiiAndCoerciveValues,
    testArbitraryTrackEventNameCannotLeakNestedData,
    testAllControlledCtaLocationsSurviveThankYouRevalidation,
    testDefaultPlanCheckoutRetainsThankYouLifecycle,
    testTrialPurchaseUsesZeroTotalAndUnitPrice,
    testFalseTrialEndsKeepsPaidPurchaseValue,
    testContradictoryOrMalformedTrialStateFailsClosed,
    testInvalidCoerciveCommerceValuesFailClosed
  ];

  for (const test of tests) {
    await test();
    process.stdout.write(`PASS: ${test.name}\n`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}

module.exports = { MemoryStorage, createRuntime, openCheckout, events, snapshot, assertReconciled };
