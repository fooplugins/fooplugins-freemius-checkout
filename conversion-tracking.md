# Conversion Tracking

This plugin lets Freemius Checkout own the checkout UI and lets Conversion Bridge own analytics dispatch. The checkout script does not call GA4, Meta, or other platforms directly. It dispatches browser `CustomEvent` events on `document`, and Conversion Bridge custom events can listen for those events and forward them to GA4 or any connected platform.

Freemius reference: https://freemius.com/help/documentation/checkout/features/tracking-analytics/

## Data Model

Each product in `index.php` should have:

```php
[
    'product_id'   => 843,
    'public_key'   => 'pk_...',
    'product_name' => 'FooGallery',
    'product_slug' => 'foogallery',
    'default_plan' => 'pro',
    'plans'        => [
        13794 => 'pro-starter',
        2090  => 'pro-expert',
        14086 => 'commerce',
    ],
]
```

The public tracking payload uses slugs:

- `product_slug`: the configured product slug, for example `foogallery`.
- `plan_slug`: the configured plan slug, for example `pro-starter`.
- `default_plan`: the configured fallback plan slug, for example `pro`, used when the checkout URL or Freemius response does not include a configured plan ID.

Numeric Freemius IDs are still used internally to open the correct checkout, but they are not the public tracking identity.

## Checkout URLs

Planned product checkout:

```html
<a href="https://checkout.freemius.com/plugin/843/plan/13794/">Buy FooGallery Starter</a>
```

This opens FooGallery and tracks:

```json
{
  "product_slug": "foogallery",
  "plan_slug": "pro-starter"
}
```

Product without a configured plan:

```html
<a href="https://checkout.freemius.com/plugin/374/">Buy FooBox</a>
```

This opens FooBox and tracks:

```json
{
  "product_slug": "foobox",
  "plan_slug": "pro"
}
```

Path values always win over query string values. Query strings can add documented scalar Freemius checkout options such as coupon, billing cycle, discount, locale, layout, renewal/update, and user-prefill options, but they cannot override `product_id`, `plan_id`, or `licenses` from the path. Callback options and the object-valued `sandbox` option are not supported as checkout link query strings.

## Checkout Defaults

The Checkout tab at Settings > Freemius Checkout stores default Freemius checkout settings in an autoloaded WordPress option.

Current defaults:

```text
show_upsells=false
annual_discount=false
billing_cycle=none
```

These defaults are merged into every `FS.Checkout.open()` call. URL-specific values still override defaults, so a checkout link with `?billing_cycle=annual` opens with `annual` even though the saved default is `none`.

## Immutable checkout source (v2)

Every diagnostic and shared/product-scoped lifecycle event carries top-level `source_context_version: 2`, `source_page`, `source_cohort`, and initiation-time `source_created_at`, alongside the same `attempt_id` and `checkout_id`. Source is captured once from the real initiating page's closed pathname projection and controlled CTA, never from queries, redirects, or callbacks. Cancellation/retry/new accepted actions create fresh IDs. `transaction_id` remains the actual validated payment ID, not an initiating ID.

See the [complete wire contract](docs/checkout-cohort-contract.md) for canonical paths, closed cohort precedence, 30-minute reconstruction TTL, blocked-storage behavior, and executable validation. Unknown paths emit `source_page=unknown`; documentation suffixes collapse to `/documentation/`. Invalid/missing/expired stored source suppresses reconstruction rather than inventing attribution.

## Lifecycle

1. A checkout link is clicked.
2. The URL path is parsed for product, plan, and license quantity.
3. The plugin captures the exact hosted checkout URL, creates an attempt ID, and dispatches `fooplugins_checkout_attempt`.
4. The existing shared loader promise loads or reuses the warmed Freemius Checkout API.
5. `FS.Checkout.open()` is called with Freemius callbacks:
   - `track(event, data)` for advanced checkout steps.
   - `purchaseCompleted(response)` for confirmed Freemius purchases.
   - `success(response)` for the final redirect.
   - `cancel()` for customer-initiated modal closure.
6. A bounded observer confirms that a Freemius iframe is visible with non-zero dimensions before either opened event is dispatched.
7. Any critical error before visible open dispatches a controlled failure event and redirects the current page to the exact captured hosted checkout URL.
8. On success, the customer is redirected to the configured thank-you URL with lightweight slug params.
9. The thank-you page dispatches the final `freemius_purchase_thank_you_viewed` event.

## Events

All events are dispatched on `document` with `bubbles: true`.

| Event | Source | Purpose |
| --- | --- | --- |
| `fooplugins_checkout_attempt` | Accepted unmodified checkout activation | Diagnostic denominator before loading/opening. |
| `fooplugins_checkout_opened` | Visible checkout iframe | Confirms successful modal rendering and reports load time. |
| `fooplugins_checkout_open_failed` | Critical error or 10-second visibility timeout | Records a controlled failure immediately before hosted fallback. |
| `fooplugins_checkout_cancelled` | Freemius `cancel()` callback | Records customer closure and visible-open duration. |
| `freemius_checkout_opened` | Visible checkout iframe | Existing product-scoped `begin_checkout` source. |
| `freemius_checkout_load` | Freemius `track('load')` | Checkout loaded. |
| `freemius_checkout_billing_cycle_updated` | Freemius `track('billing-cycle-updated')` | Billing cycle changed. |
| `freemius_checkout_licenses_inc` | Freemius `track('licenses-inc')` | License quantity increased. |
| `freemius_checkout_licenses_dec` | Freemius `track('licenses-dec')` | License quantity decreased. |
| `freemius_checkout_coupon_added` | Freemius `track('coupon-added')` | Coupon applied. |
| `freemius_checkout_coupon_removed` | Freemius `track('coupon-removed')` | Coupon removed. |
| `freemius_checkout_coupon_updated` | Freemius `track('coupon-updated')` | Coupon changed by checkout logic. |
| `freemius_checkout_review_order` | Freemius `track('review-order')` | Buyer reached review step. |
| `freemius_checkout_complete` | Freemius `track('complete')` | Freemius checkout reports completion. |
| `freemius_purchase_confirmed` | Freemius `purchaseCompleted(response)` | Purchase confirmed by Freemius, includes revenue fields when available. |
| `freemius_checkout_success` | Freemius `success(response)` | Fired immediately before redirect. |
| `freemius_purchase_thank_you_viewed` | Thank-you page load | Final lifecycle marker after redirect. |

Existing Freemius lifecycle events are emitted twice:

- Shared lifecycle event, for example `freemius_checkout_opened`.
- Product-scoped event, for example `foogallery_freemius_checkout_opened`.

Conversion Bridge custom events should listen to the product-scoped event names. That allows a separate validated event set per product without duplicate firing across every product on the site.

The four `fooplugins_checkout_*` reliability events are global and are emitted once per lifecycle transition. Conversion Bridge should listen to their exact unscoped names so diagnostics are not duplicated for every product.

## Reliability Diagnostic Payload

All four diagnostics include `attempt_id`, `checkout_id`, `source_context_version`, `source_page`, `source_cohort`, `source_created_at`, numeric `product_id`, numeric `plan_id`, numeric `licenses`, `billing_cycle`, boolean `is_trial`, controlled `cta_location`, and `checkout_mode=modal`. Opened adds `checkout_load_ms`; failure adds `failure_stage`, `error_code`, and `checkout_load_ms`; cancellation adds `checkout_open_duration_ms`.

`attempt_id` is intentionally high cardinality. Send it with the events for debugging and event pairing, but do not register it as a GA4 custom dimension. No raw exception, stack, email, name, token, license key, or payment data is included.

The hosted fallback is a checkout safety invariant. Once a normal click has been intercepted, SDK load errors, missing product configuration, handler errors, open errors, unexpected lifecycle errors, and render timeouts all call `window.location.assign()` with the original final anchor URL. Modified and middle clicks retain native browser behavior.

Any other Freemius `track` event is normalized by replacing non-alphanumeric characters with underscores. For example `paypal-express-checkout` becomes `freemius_checkout_paypal_express_checkout`.

## Event Payload

Base checkout events include fields like:

```json
{
  "checkout_id": "foogallery-pro-starter-mq2do7wg-we18peex",
  "category": "freemius_checkout",
  "product_slug": "foogallery",
  "plan_slug": "pro-starter",
  "product_name": "FooGallery",
  "billing_cycle": "none",
  "licenses": 1,
  "coupon": "SAVE20",
  "trial": "free",
  "affiliation": "Your Company",
  "checkout_stage": "checkout_opened"
}
```

Purchase events add a validated commerce context:

```json
{
  "transaction_id": "123456",
  "value": 100,
  "currency": "USD",
  "item_id": "foogallery",
  "item_name": "FooGallery",
  "item_variant": "pro-starter",
  "item_category": "Plugin",
  "quantity": 3,
  "price": 33.333333333333336,
  "items": [
    {
      "item_id": "foogallery",
      "item_name": "FooGallery",
      "item_variant": "pro-starter",
      "item_category": "Plugin",
      "price": 33.333333333333336,
      "quantity": 3,
      "currency": "USD"
    }
  ]
}
```

`value` is the total transaction amount, normalized to exact cents. `price` and `items[0].price` are the deterministic unit price `value / quantity`; multiplying unit price by quantity and rounding to cents therefore reconciles to `value`. A zero-value trial produces zero for both total and unit price.

Commerce context is fail-closed. The producer requires a positive decimal Freemius purchase ID (`^[1-9][0-9]{0,19}$`), a finite non-negative numeric amount with no fractional cents, a three-letter currency code, and a positive integer numeric quantity. Optional coupons are retained only as trimmed ASCII campaign tokens (`[A-Za-z0-9_-]`, at most 64 characters, and not a phone-shaped all-digit value); objects, emails, phone values, Unicode names, and other coercive coupon data are omitted before dispatch or storage. Arbitrary identifiers, zero IDs, numeric amount strings, invalid currencies, negative/non-finite values, fractional-cent totals, and coercive quantities do not emit `freemius_purchase_confirmed`, are not stored for the thank-you marker, and are not added to redirect parameters. A success callback still emits its non-commerce lifecycle event and redirects without manufactured commerce fields. If one Freemius callback is partial after another callback supplied a valid purchase, the first validated context is reused. Duplicate or reordered callbacks do not duplicate the confirmed or success lifecycle event.

The plugin intentionally does not forward raw Freemius response data or buyer email addresses.

## Thank-You Redirect

On success, the plugin appends lightweight URL params to the configured `success_url`:

```text
/purchase-thanks/?fs_checkout_id=foogallery-pro-starter-mq2do7wg-we18peex&fs_product=foogallery&fs_plan=pro-starter&fs_transaction=123456
```

The full purchase context is also stored in `sessionStorage` before redirect. The thank-you page combines the URL params with the stored context and dispatches:

```text
freemius_purchase_thank_you_viewed
```

The thank-you event is only dispatched when the current path matches the configured success URL and the URL params match the purchase context stored in `sessionStorage` before redirect. If browser storage is unavailable, or if someone opens a crafted thank-you URL without the matching stored checkout context, the final thank-you purchase event is intentionally not emitted.

## Conversion Bridge Setup

Create a Conversion Bridge custom event for each lifecycle event you want to track.

The plugin includes an admin setup page at Settings > Freemius Checkout. Its global diagnostics panel creates and validates the four reliability events once. The product panel creates and validates only three product-scoped lifecycle definitions. It does not create a thank-you `purchase` mapping or configure a GA4, Meta, or other destination-specific purchase route.

Required baseline for a product such as FooGallery:

| Conversion Bridge custom event | Trigger | Selector | Event name | Platform event type |
| --- | --- | --- | --- | --- |
| Checkout opened | Event | `document` | `foogallery_freemius_checkout_opened` | `begin_checkout` |
| Review order | Event | `document` | `foogallery_freemius_checkout_review_order` | `add_payment_info` |
| Purchase confirmed diagnostic | Event | `document` | `foogallery_freemius_purchase_confirmed` | `freemius_purchase_confirmed` |

The required-event setup/repair contract ends at those three lifecycle definitions. Destination owners may consume vendor-neutral browser lifecycle events separately, but this plugin's supported setup must never create or repair a `purchase` destination mapping. In particular, mapping both confirmation and thank-you events as `purchase` can double count revenue.

Register aggregate GA4 dimensions for closed `source_page`, `source_cohort`, configured `product_slug`/`plan_slug`, `licenses`, `cta_location`, `checkout_mode`, `failure_stage`, and `is_trial`, plus a custom metric for `checkout_load_ms`. Never register/use `attempt_id`, `checkout_id`, `transaction_id`, raw Freemius product/plan IDs, or `source_created_at` as reporting/custom dimensions. Initiating IDs are linkage/dedup/debug keys, and the transaction ID remains a transaction field only. Leave `error_code` and open duration unregistered. Build the reliability funnel from `fooplugins_checkout_attempt` to `fooplugins_checkout_opened` to the existing valid `purchase` event.

### Custom Parameters

In Conversion Bridge custom event parameters, use `%%e.detail.FIELD%%`. Conversion Bridge renders custom event listeners with the event argument named `e`.

Suggested parameters:

| Key | Value |
| --- | --- |
| `attempt_id` | `%%e.detail.attempt_id%%` |
| `checkout_id` | `%%e.detail.checkout_id%%` |
| `source_context_version` | `%%e.detail.source_context_version%%` |
| `source_page` | `%%e.detail.source_page%%` |
| `source_cohort` | `%%e.detail.source_cohort%%` |
| `source_created_at` | `%%e.detail.source_created_at%%` |
| `product_slug` | `%%e.detail.product_slug%%` |
| `plan_slug` | `%%e.detail.plan_slug%%` |
| `checkout_stage` | `%%e.detail.checkout_stage%%` |
| `billing_cycle` | `%%e.detail.billing_cycle%%` |
| `licenses` | `%%e.detail.licenses%%` |
| `coupon` | `%%e.detail.coupon%%` |
| `transaction_id` | `%%e.detail.transaction_id%%` |
| `currency` | `%%e.detail.currency%%` |
| `value` | `%%e.detail.value%%` |
| `item_id` | `%%e.detail.item_id%%` |
| `item_name` | `%%e.detail.item_name%%` |
| `item_variant` | `%%e.detail.item_variant%%` |
| `quantity` | `%%e.detail.quantity%%` |
| `items` | `%%e.detail.items%%` |

The commerce fields are documented for destination owners and diagnostics. They are not instructions for creating a Conversion Bridge `purchase` mapping.

## Example Event Configurations

### Checkout Opened

Use this for top-of-funnel checkout starts.

```text
Trigger: Event
Selector: document
Event name: foogallery_freemius_checkout_opened
Event type: begin_checkout
Value: leave blank
```

Parameters:

```text
checkout_id=%%e.detail.checkout_id%%
product_slug=%%e.detail.product_slug%%
plan_slug=%%e.detail.plan_slug%%
billing_cycle=%%e.detail.billing_cycle%%
licenses=%%e.detail.licenses%%
coupon=%%e.detail.coupon%%
```

### Review Order

Use this to track users who reached the final review step before confirming payment.

```text
Trigger: Event
Selector: document
Event name: foogallery_freemius_checkout_review_order
Event type: add_payment_info
Value: leave blank
```

Parameters:

```text
checkout_id=%%e.detail.checkout_id%%
product_slug=%%e.detail.product_slug%%
plan_slug=%%e.detail.plan_slug%%
checkout_stage=%%e.detail.checkout_stage%%
currency=%%e.detail.currency%%
```

### Purchase lifecycle ownership

`freemius_purchase_confirmed` and `freemius_purchase_thank_you_viewed` remain vendor-neutral browser lifecycle events. The required-event builder exposes only the confirmation diagnostic and intentionally omits a destination purchase mapping. A separate owning integration must validate and route any final purchase event exactly once.

## Debugging

Paste this into the browser console on a checkout page to inspect emitted events:

```js
[
  "fooplugins_checkout_attempt",
  "fooplugins_checkout_opened",
  "fooplugins_checkout_open_failed",
  "fooplugins_checkout_cancelled",
  "freemius_checkout_opened",
  "freemius_checkout_load",
  "freemius_checkout_billing_cycle_updated",
  "freemius_checkout_licenses_inc",
  "freemius_checkout_licenses_dec",
  "freemius_checkout_coupon_added",
  "freemius_checkout_coupon_removed",
  "freemius_checkout_coupon_updated",
  "freemius_checkout_review_order",
  "freemius_checkout_complete",
  "freemius_purchase_confirmed",
  "freemius_checkout_success",
  "freemius_purchase_thank_you_viewed",
  "foogallery_freemius_checkout_opened",
  "foogallery_freemius_checkout_review_order",
  "foogallery_freemius_purchase_confirmed",
  "foogallery_freemius_purchase_thank_you_viewed"
].forEach(function(eventName){
  document.addEventListener(eventName, function(e){
    console.log(eventName, e.detail);
  });
});
```

The thank-you event cannot be tested by opening only a crafted URL because a matching, schema-valid same-session context is also required. This is a client-side minimization and consistency boundary, not cryptographic proof of callback provenance: a user controlling their own browser storage can synthesize a fully valid context, but arbitrary fields and malformed values are rejected and are not forwarded. Use `node tests/checkout-lifecycle.test.js` for the real callback, generated-redirect, storage-reconstruction, and reload path without making a purchase.
