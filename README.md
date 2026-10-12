# Freemius Checkout

A WordPress plugin that handles Freemius checkout integration for configured products.

## Description

This plugin provides an easy way to integrate Freemius checkout into your WordPress site. You just need to edit the main plugin file `index.php` and add your products.

Once activated, the plugin hooks up all anchor tags that point to Freemius Checkout. The Freemius checkout script (https://checkout.freemius.com/js/v1/) is loaded on demand when a checkout link is opened.

## Features

- Easy integration for multiple products
- Preconnects to Freemius and warms the latest checkout script (https://checkout.freemius.com/js/v1/) asynchronously after the page load completes when checkout links are present
- Shows the Freemius checkout modal for any anchor tag with a href starting with https://checkout.freemius.com/
- Confirms that the checkout iframe is visibly rendered before reporting a successful open
- Redirects the current page to the original hosted checkout URL if loading, handler creation, modal opening, or rendering fails
- Emits checkout attempt, visible-open, failure, and cancellation diagnostics through browser events for Conversion Bridge
- Configurable success URL after purchase (global or per product)
- Emits vendor-neutral checkout and purchase lifecycle events for analytics bridges; the plugin does not call or configure GA4, Meta, or another destination directly
- Supports URL's with trials and coupons
- Supports Freemius dunning mechanism (if configured in your Freemius dashboard)
- Auto-appends coupon querystring to all checkout url's if on the current page 

## How to use

Fork this repo and edit the main plugin file `index.php`.

Example:
 ```php
 $plugin_config = [
    'plugins' => [
        [
            'product_id' => 843,
            'public_key' => "pk_d87616455a835af1d0658699d0192",
            'product_name' => "FooGallery",
        ],
        [
            'product_id' => 123456,
            'public_key' => "pk_7a17ec700c89fe71a25605589e0b9",
            'product_name' => "My Product",
            'success_url' => site_url("/my-product-purchase-thanks/"), // Optional
        ],
    ],
    'success_url' => site_url("/purchase-thanks/"),
    'affiliation' => "My Company"
];
 ```

Then add anchor tags to your site with an href starting with https://checkout.freemius.com/

Simple Example:
```html
<a href="https://checkout.freemius.com/plugin/843/plan/14086/">Buy</a>
```

License Example:
```html
<a href="https://checkout.freemius.com/plugin/843/plan/14086/licenses/5/">Buy</a>
```

Trial Example:
 ```html
 <a href="https://checkout.freemius.com/plugin/843/plan/14086/?trial=free">Try for free</a>
 ```

Coupon Example:
```html
<a href="https://checkout.freemius.com/plugin/843/plan/14086/?coupon=FOO">Buy with coupon</a>
```

Another Example (using supported checkout querystrings)
```html
<a href="https://checkout.freemius.com/plugin/843/plan/14086/?bundle_discount=true&billing_cycle_selector=responsive_list">Buy</a>
```

Checkout link query strings are limited to documented Freemius checkout options and validated by type before being passed to `FS.Checkout.open()`. Product, plan, and license values come from the URL path and cannot be overridden from the query string. Callback options and the object-valued `sandbox` option are not supported as checkout link query strings.

Known CTA locations can be reported with a controlled attribute:

```html
<a
  href="https://checkout.freemius.com/plugin/843/plan/14086/"
  data-checkout-location="product_pricing_card"
>Buy</a>
```

Supported values are `product_pricing_card`, `product_pricing_sticky`, `compare_hero`, `compare_table`, `compare_plan_section`, `trial`, `plan_advisor_result`, and `other`. Untagged or unknown values are reported as `other`.

Checkout events carry immutable, privacy-safe `source_context_version: 2`, `source_page`, `source_cohort`, and initiation-time `source_created_at` alongside `attempt_id` and `checkout_id`. Source is captured from the real initiating page/controlled CTA, never a query string or callback. Same-session thank-you reconstruction expires after 30 minutes and fails closed on missing, inconsistent, or invalid source. See the [wire contract, closed page/cohort allowlists, ID semantics, reporting restrictions, and executable verification](docs/checkout-cohort-contract.md).

### Freemius Documentation

For more info on Freemius checkout, please refer to the [Freemius Documentation](https://freemius.com/help/documentation/checkout/freemius-checkout-buy-button/).

## Build a Release ZIP

From the FooPlugins FSE monorepo, run:

```sh
npm run package:checkout:production
```

The production ZIP version is read from the plugin header in `index.php`. Development files, tests, source maps, and repository metadata are excluded.
