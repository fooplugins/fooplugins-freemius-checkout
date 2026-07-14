<?php
/**
 * Plugin Name: Freemius Checkout Plugin
 * Description: A plugin for Freemius checkout.
 * Version:     2.0.11
 * Author:      Brad Vincent
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

defined( 'ABSPATH' ) || exit;

DEFINE( 'FOOPLUGINS_FREEMIUS_CHECKOUT_VERSION', '2.0.11' );
DEFINE( 'FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE', 'fooplugins-freemius-checkout' );
define( 'FOOPLUGINS_FREEMIUS_CHECKOUT_URL', plugin_dir_url( __FILE__ ) );
define( 'FOOPLUGINS_FREEMIUS_CHECKOUT_DEFAULTS_OPTION', 'fooplugins_freemius_checkout_defaults' );

function fooplugins_freemius_checkout_default_checkout_defaults() {
	return array(
		'show_upsells'    => 'false',
		'annual_discount' => 'false',
		'billing_cycle'   => 'none',
	);
}

function fooplugins_freemius_checkout_sanitize_checkout_default_key( $key ) {
	$key = trim( (string) $key );
	$key = preg_replace( '/[^A-Za-z0-9_-]/', '', $key );
	if ( ! is_string( $key ) ) {
		return '';
	}

	if ( in_array( strtolower( $key ), array( '__proto__', 'prototype', 'constructor' ), true ) ) {
		return '';
	}

	return $key;
}

function fooplugins_freemius_checkout_sanitize_checkout_defaults( $defaults ) {
	if ( ! is_array( $defaults ) ) {
		return array();
	}

	$sanitized = array();
	foreach ( $defaults as $key => $value ) {
		$key = fooplugins_freemius_checkout_sanitize_checkout_default_key( $key );
		if ( '' === $key ) {
			continue;
		}

		if ( is_bool( $value ) ) {
			$value = $value ? 'true' : 'false';
		} elseif ( is_scalar( $value ) ) {
			$value = sanitize_text_field( (string) $value );
		} else {
			continue;
		}

		$sanitized[ $key ] = $value;
	}

	return $sanitized;
}

function fooplugins_freemius_checkout_get_checkout_defaults() {
	$missing  = '__fooplugins_freemius_checkout_defaults_missing__';
	$defaults = get_option( FOOPLUGINS_FREEMIUS_CHECKOUT_DEFAULTS_OPTION, $missing );
	if ( $missing === $defaults ) {
		$defaults = fooplugins_freemius_checkout_default_checkout_defaults();
	}

	return fooplugins_freemius_checkout_sanitize_checkout_defaults(
		$defaults
	);
}

function fooplugins_freemius_checkout_update_checkout_defaults( $defaults ) {
	$defaults = fooplugins_freemius_checkout_sanitize_checkout_defaults( $defaults );

	if ( false === get_option( FOOPLUGINS_FREEMIUS_CHECKOUT_DEFAULTS_OPTION, false ) ) {
		add_option( FOOPLUGINS_FREEMIUS_CHECKOUT_DEFAULTS_OPTION, $defaults, '', true );
		return;
	}

	update_option( FOOPLUGINS_FREEMIUS_CHECKOUT_DEFAULTS_OPTION, $defaults, true );
}

function fooplugins_freemius_checkout_get_config() {
	return [
		'plugins' => [
			[
				'product_id' => 843,
				'public_key' => "pk_d87616455a835af1d0658699d0192",
				'product_name' => "FooGallery",
				'product_slug' => "foogallery",
				'default_plan' => "pro",
				//'success_url' => site_url("/foogallery-purchase-thanks/"), // Optional : can override the global success_url
				'plans'        => [
					13794 => 'pro-starter',
					2090 => 'pro-expert',
					14086 => 'commerce',
				],
			],
			[
				'product_id' => 374,
				'public_key' => "pk_7a17ec700c89fe71a25605589e0b9",
				'product_name' => "FooBox",
				'product_slug' => "foobox",
				'default_plan' => "pro",
			],
			[
				'product_id' => 6696,
				'public_key' => "pk_66340abdc312fe16c68bd10b41948",
				'product_name' => "FooBar",
				'product_slug' => "foobar",
				'default_plan' => "pro",
			],
			[
				'product_id' => 1833,
				'public_key' => "pk_66ec7d10d55d9cd6b6813a81e69f7",
				'product_name' => "Plugin Bundle",
				'product_slug' => "plugin-bundle",
				'default_plan' => "pro",
			],
			[
				'product_id' => 14147,
				'public_key' => "pk_f311a65bfd8e62a67fb0270d64733",
				'product_name' => "FooGallery User Uploads",
				'product_slug' => "foogallery-user-uploads",
				'default_plan' => "pro",
			],
			[
				'product_id' => 14677,
				'public_key' => "pk_88b6346482978e6778a77c484cfbe",
				'product_name' => "FooConvert",
				'product_slug' => "fooconvert",
				'default_plan' => "pro",
			],
			[
				'product_id' => 3787,
				'public_key' => "pk_d759d76877964aea0c0fcae6e69ca",
				'product_name' => "FooTable jQuery Developer",
				'product_slug' => "footable-jquery-developer",
				'default_plan' => "pro",
			],
			[
				'product_id' => 18179,
				'public_key' => "pk_6a87f6f1b0ed7d17e2d402356a089",
				'product_name' => "PRO Commerce Bundle",
				'product_slug' => "pro-commerce-bundle",
				'default_plan' => "pro",
			],
			[
				'product_id' => 20634,
				'public_key' => "pk_2a10e2105e540cbac4e28f74c60f5",
				'product_name' => "FooPass Bundle",
				'product_slug' => "foopass-bundle",
				'default_plan' => "pro",
			],
			[
				'product_id' => 20776,
				'public_key' => "pk_73dfd509754654f571485b3a03642",
				'product_name' => "FooGallery Social",
				'product_slug' => "foogallery-social",
				'default_plan' => "pro",
			],
			[
				'product_id' => 20952,
				'public_key' => "pk_7783bbab66393eeb4bf90f340c908",
				'product_name' => "FooGallery Whitelabel",
				'product_slug' => "foogallery-whitelabel",
				'default_plan' => "pro",
			],
			[
				'product_id' => 23356,
				'public_key' => "pk_79708aae53e6537347907ce20c7f7",
				'product_name' => "Partner Listing",
				'product_slug' => "fooplugins-partner-listing",
				'default_plan' => "listing",
			],
			[
				'product_id' => 31072,
				'public_key' => "pk_48afde79b240da81c9e9ee49e0ec1",
				'product_name' => "Migration Service",
				'product_slug' => "fooplugins-migration-service",
				'default_plan' => "migration",
			]
		],
		'success_url'        => site_url("/purchase-thanks/"),
		'affiliation'        => "FooPlugins",
		'checkout_defaults'  => fooplugins_freemius_checkout_get_checkout_defaults()
	];
}

// Register Freemius Scripts the correct way
function fooplugins_wp_enqueue_scripts() {
	$plugin_config = fooplugins_freemius_checkout_get_config();

	wp_register_script(
		FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE,
		FOOPLUGINS_FREEMIUS_CHECKOUT_URL . 'js/fooplugins-freemius.js',
		array(),
		FOOPLUGINS_FREEMIUS_CHECKOUT_VERSION,
		true);

	wp_localize_script(
		FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE,
		'FOOCHECKOUT',
		$plugin_config
	);

	wp_enqueue_script(FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE);
}

/**
 * Preconnect to Freemius when the checkout bridge will load on the page.
 *
 * @param array<int, string|array<string, string>> $urls          Resource hint URLs.
 * @param string                                  $relation_type Resource hint relation type.
 * @return array<int, string|array<string, string>>
 */
function fooplugins_freemius_checkout_resource_hints( $urls, $relation_type ) {
	if ( 'preconnect' !== $relation_type || ! wp_script_is( FOOPLUGINS_FREEMIUS_CHECKOUT_SCRIPT_HANDLE, 'enqueued' ) ) {
		return $urls;
	}

	$urls[] = array(
		'href'        => 'https://checkout.freemius.com',
		'crossorigin' => 'anonymous',
	);

	return $urls;
}

if ( is_admin() ) {
	require_once __DIR__ . '/includes/admin.php';
}

add_action( 'wp_enqueue_scripts', 'fooplugins_wp_enqueue_scripts', 20 );
add_filter( 'wp_resource_hints', 'fooplugins_freemius_checkout_resource_hints', 10, 2 );
