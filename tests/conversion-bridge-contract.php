<?php

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );

function add_action( $hook, $callback ) {}
function __( $text, $domain = null ) {
	return $text;
}

require_once dirname( __DIR__ ) . '/includes/conversion-bridge-admin.php';

function contract_assert( $condition, $message ) {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
}

function assert_vendor_neutral_product_contract( $product ) {
	$definitions = fooplugins_freemius_checkout_cb_required_events( $product );

	contract_assert(
		array_keys( $definitions ) === array( 'checkout_opened', 'review_order', 'purchase_confirmed' ),
		'Required definitions must contain only the three vendor-neutral product lifecycle events.'
	);
	contract_assert( 'begin_checkout' === $definitions['checkout_opened']['type'], 'Checkout opened must remain begin_checkout.' );
	contract_assert( 'add_payment_info' === $definitions['review_order']['type'], 'Review order must remain add_payment_info.' );
	contract_assert( 'freemius_purchase_confirmed' === $definitions['purchase_confirmed']['type'], 'Purchase confirmed must remain a custom diagnostic type.' );

	foreach ( $definitions as $requirement => $definition ) {
		contract_assert( 'purchase' !== $definition['type'], "{$requirement} must not map to type=purchase." );
		contract_assert( false === strpos( $definition['event'], 'thank_you' ), "{$requirement} must not listen to a thank-you event." );

		$built = fooplugins_freemius_checkout_cb_build_event( $product, $requirement, $definition );
		contract_assert( 'purchase' !== $built['type'], "Built {$requirement} event must not map to type=purchase." );
		contract_assert( false === strpos( $built['event'], 'thank_you' ), "Built {$requirement} event must not listen to a thank-you event." );
	}
}

$products = array(
	array(
		'product_slug' => 'foogallery',
		'product_name' => 'FooGallery',
	),
	array(
		'product_slug' => 'foobox',
		'product_name' => 'FooBox',
	),
);

foreach ( $products as $product ) {
	assert_vendor_neutral_product_contract( $product );
}

$foobox = fooplugins_freemius_checkout_cb_required_events( $products[1] );
contract_assert(
	'foobox_freemius_checkout_opened' === $foobox['checkout_opened']['event'],
	'Other products must retain product-scoped checkout destinations.'
);
contract_assert(
	'foobox_freemius_purchase_confirmed' === $foobox['purchase_confirmed']['event'],
	'Other products must retain product-scoped confirmation diagnostics.'
);

$diagnostics = fooplugins_freemius_checkout_cb_diagnostic_events();
contract_assert(
	array_keys( $diagnostics ) === array( 'checkout_attempt', 'checkout_opened', 'checkout_open_failed', 'checkout_cancelled' ),
	'All four global reliability diagnostics must remain defined.'
);
foreach ( $diagnostics as $requirement => $definition ) {
	contract_assert( 'purchase' !== $definition['type'], "Global diagnostic {$requirement} must not map to purchase." );
	contract_assert( 0 === strpos( $definition['event'], 'fooplugins_checkout_' ), "Global diagnostic {$requirement} must retain its unscoped event." );
}

function assert_source_linkage_parameters( $parameters, $label ) {
	foreach ( array( 'attempt_id', 'checkout_id', 'source_context_version', 'source_page', 'source_cohort', 'source_created_at' ) as $key ) {
		contract_assert( isset( $parameters[$key] ) && $parameters[$key] === '%%e.detail.' . $key . '%%', "{$label} must forward immutable {$key} from event detail only." );
	}
}

foreach ( $products as $product ) {
	foreach ( fooplugins_freemius_checkout_cb_required_events( $product ) as $key => $definition ) {
		assert_source_linkage_parameters( $definition['parameters'], $key );
	}
}
foreach ( $diagnostics as $key => $definition ) {
	assert_source_linkage_parameters( $definition['parameters'], $key );
}

fwrite( STDOUT, "PASS: Conversion Bridge definitions are vendor-neutral and preserve lifecycle diagnostics and immutable source linkage.\n" );
