# FooPlugins Freemius Checkout

A WordPress plugin that handles Freemius checkout integration for FooPlugins products.

## Description

This plugin provides an easy way to integrate Freemius checkout into your WordPress site. You just need to edit the main plugin file `index.php` and add your products.

Once activated, the plugin will automatically load the necessary Freemius checkout script (https://checkout.freemius.com/js/v1/) on your site. And then hook up all anchor tags to open the Freemius checkout modal.

## Features

- Easy integration for multiple products
- Uses latest Freemius checkout script (https://checkout.freemius.com/js/v1/)
- Shows the Freemius checkout modal for any anchor tag with a href starting with https://checkout.freemius.com/
- Configurable success URL after purchase (global or per product)
- After purchase tracking : Google Analytics 4 and Facebook Pixel
- Supports URL's with trials and coupons
- Supports Freemius dunning mechanism (if configured in your Freemius dashboard)

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

Another Example (using any other supported querystrings)
```html
<a href="https://checkout.freemius.com/plugin/843/plan/14086/?bundle_discount=true&billing_cycle_selector=responsive_list">Buy</a>
```

### Freemius Documentation

For more info on Freemius checkout, please refer to the [Freemius Documentation](https://freemius.com/help/documentation/checkout/freemius-checkout-buy-button/).


