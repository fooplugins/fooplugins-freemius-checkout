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

## Lifecycle

1. A checkout link is clicked.
2. The URL path is parsed for product, plan, and license quantity.
3. The plugin builds a checkout context using configured product and plan slugs.
4. `FS.Checkout.open()` is called with Freemius callbacks:
   - `track(event, data)` for advanced checkout steps.
   - `purchaseCompleted(response)` for confirmed Freemius purchases.
   - `success(response)` for the final redirect.
5. The plugin dispatches Conversion Bridge friendly `CustomEvent` events on `document`.
6. On success, the customer is redirected to the configured thank-you URL with lightweight slug params.
7. The thank-you page dispatches the final `freemius_purchase_thank_you_viewed` event.

## Events

All events are dispatched on `document` with `bubbles: true`.

| Event | Source | Purpose |
| --- | --- | --- |
| `freemius_checkout_opened` | Link click, before the modal opens | Start of checkout lifecycle. |
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

Each event is emitted twice:

- Shared lifecycle event, for example `freemius_checkout_opened`.
- Product-scoped event, for example `foogallery_freemius_checkout_opened`.

Conversion Bridge custom events should listen to the product-scoped event names. That allows a separate validated event set per product without duplicate firing across every product on the site.

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

Purchase events can add:

```json
{
  "transaction_id": "123456",
  "value": 49,
  "currency": "USD",
  "item_id": "foogallery",
  "item_name": "FooGallery",
  "item_variant": "pro-starter",
  "item_category": "Plugin",
  "quantity": 1,
  "price": 49,
  "items": [
    {
      "item_id": "foogallery",
      "item_name": "FooGallery",
      "item_variant": "pro-starter",
      "item_category": "Plugin",
      "price": 49,
      "quantity": 1,
      "currency": "USD"
    }
  ]
}
```

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

The plugin includes an admin setup page at Settings > Freemius Checkout. Use that page to create and validate the required product-scoped custom events for each configured product.

Required baseline for a product such as FooGallery:

| Conversion Bridge custom event | Trigger | Selector | Event name | Platform event type |
| --- | --- | --- | --- | --- |
| Checkout opened | Event | `document` | `foogallery_freemius_checkout_opened` | `begin_checkout` |
| Review order | Event | `document` | `foogallery_freemius_checkout_review_order` | `add_payment_info` |
| Purchase confirmed | Event | `document` | `foogallery_freemius_purchase_confirmed` | `freemius_purchase_confirmed` |
| Thank-you purchase | Event | `document` | `foogallery_freemius_purchase_thank_you_viewed` | `purchase` |

Use only one event as the real GA4 `purchase` event. If purchase completion is defined as "the user reached the purchase thank-you page", use the product-scoped thank-you event, for example `foogallery_freemius_purchase_thank_you_viewed`, as `purchase` and keep the product-scoped confirmed event, for example `foogallery_freemius_purchase_confirmed`, as a custom diagnostic event. Mapping both as `purchase` will double count revenue.

### Custom Parameters

In Conversion Bridge custom event parameters, use `%%e.detail.FIELD%%`. Conversion Bridge renders custom event listeners with the event argument named `e`.

Suggested parameters:

| Key | Value |
| --- | --- |
| `checkout_id` | `%%e.detail.checkout_id%%` |
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

For the Conversion Bridge event value field on the purchase event, use:

```text
%%e.detail.value%%
```

For GA4 purchase events, include `items=%%e.detail.items%%`. Conversion Bridge preserves this placeholder as a runtime JavaScript value, so GA4 receives an actual ecommerce `items` array instead of a string.

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

### Final Purchase On Thank-You Page

Use this if the source of truth for purchase completion is the redirect to `/purchase-thanks/`.

```text
Trigger: Event
Selector: document
Event name: foogallery_freemius_purchase_thank_you_viewed
Event type: purchase
Value: %%e.detail.value%%
```

Parameters:

```text
transaction_id=%%e.detail.transaction_id%%
checkout_id=%%e.detail.checkout_id%%
product_slug=%%e.detail.product_slug%%
plan_slug=%%e.detail.plan_slug%%
currency=%%e.detail.currency%%
value=%%e.detail.value%%
item_id=%%e.detail.item_id%%
item_name=%%e.detail.item_name%%
item_variant=%%e.detail.item_variant%%
quantity=%%e.detail.quantity%%
items=%%e.detail.items%%
```

## Debugging

Paste this into the browser console on a checkout page to inspect emitted events:

```js
[
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

The thank-you event cannot be tested by opening a crafted URL by itself. To test it manually, first create a matching stored purchase context in the browser console, then open the matching thank-you URL:

```js
sessionStorage.setItem(
  "fooplugins_freemius_checkout:test-123",
  JSON.stringify({
    checkout_id: "test-123",
    category: "freemius_checkout",
    product_slug: "foogallery",
    plan_slug: "pro-starter",
    product_name: "FooGallery",
    transaction_id: "txn-123",
    value: 49,
    currency: "USD",
    item_id: "foogallery",
    item_name: "FooGallery",
    item_variant: "pro-starter",
    quantity: 1,
    items: [
      {
        item_id: "foogallery",
        item_name: "FooGallery",
        item_variant: "pro-starter",
        quantity: 1,
        price: 49,
        currency: "USD"
      }
    ]
  })
);
```

```text
/purchase-thanks/?fs_checkout_id=test-123&fs_product=foogallery&fs_plan=pro-starter&fs_transaction=txn-123
```

That should emit `freemius_purchase_thank_you_viewed` only when `/purchase-thanks/` is the configured success URL path.
