<?php
/**
 * Plugin Name: FooPlugins Freemius Checkout Plugin
 * Description: A plugin for Freemius checkout on FooPlugins
 * Version:     2.0.4
 * Author:      Brad Vincent
 * Author URI:  https://fooplugins.com
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

DEFINE( 'FOOPLUGINS_FREEMIUS_CHECKOUT_VERSION', '2.0.4' );
DEFINE( 'FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE', 'fooplugins-freemius-checkout' );
define( 'FOOPLUGINS_FREEMIUS_CHECKOUT_URL', plugin_dir_url( __FILE__ ) );

// Register Freemius Scripts the correct way
function fooplugins_wp_enqueue_scripts() {
	$plugin_config = [
		'plugins' => [
			[
				'product_id' => 843,
				'public_key' => "pk_d87616455a835af1d0658699d0192",
				'product_name' => "FooGallery",
				//'success_url' => site_url("/foogallery-purchase-thanks/"), // Optional : can override the global success_url
			],
			[
				'product_id' => 374,
				'public_key' => "pk_7a17ec700c89fe71a25605589e0b9",
				'product_name' => "FooBox"
			],
			[
				'product_id' => 6696,
				'public_key' => "pk_66340abdc312fe16c68bd10b41948",
				'product_name' => "FooBar"
			],
			[
				'product_id' => 1833,
				'public_key' => "pk_66ec7d10d55d9cd6b6813a81e69f7",
				'product_name' => "Plugin Bundle"
			],
			[
				'product_id' => 14147,
				'public_key' => "pk_f311a65bfd8e62a67fb0270d64733",
				'product_name' => "FooGallery User Uploads"
			],
			[
				'product_id' => 14677,
				'public_key' => "pk_88b6346482978e6778a77c484cfbe",
				'product_name' => "FooConvert"
			],
			[
				'product_id' => 3787,
				'public_key' => "pk_d759d76877964aea0c0fcae6e69ca",
				'product_name' => "FooTable jQuery Developer"
			],
			[
				'product_id' => 18179,
				'public_key' => "pk_6a87f6f1b0ed7d17e2d402356a089",
				'product_name' => "PRO Commerce Bundle"
			],
			[
				'product_id' => 20634,
				'public_key' => "pk_2a10e2105e540cbac4e28f74c60f5",
				'product_name' => "FooPlugins Business Bundle"
			]
		],
		'success_url' => site_url("/purchase-thanks/"),
		'affiliation' => "FooPlugins"
	];

	wp_register_script(
		'freemius-checkout-external',
		'https://checkout.freemius.com/js/v1/',
		array(),
		FOOPLUGINS_FREEMIUS_CHECKOUT_VERSION,
		true);

	wp_register_script(
		FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE,
		FOOPLUGINS_FREEMIUS_CHECKOUT_URL . 'js/fooplugins-freemius.js',
		array( 'freemius-checkout-external' ),
		FOOPLUGINS_FREEMIUS_CHECKOUT_VERSION,
		true);

	wp_localize_script(
		FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE,
		'FOOCHECKOUT',
		$plugin_config
	);

	wp_enqueue_script(FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE);
}

add_action( 'wp_enqueue_scripts', 'fooplugins_wp_enqueue_scripts', 20 );
