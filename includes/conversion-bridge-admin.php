<?php

defined( 'ABSPATH' ) || exit;

define( 'FOOPLUGINS_FREEMIUS_CHECKOUT_CB_EVENT_ID_PREFIX', 'fooplugins_' );

add_action( 'admin_post_fooplugins_freemius_checkout_cb_create_events', 'fooplugins_freemius_checkout_cb_create_events_action' );
add_action( 'admin_post_fooplugins_freemius_checkout_cb_delete_event', 'fooplugins_freemius_checkout_cb_delete_event_action' );
add_action( 'admin_post_fooplugins_freemius_checkout_cb_create_diagnostics', 'fooplugins_freemius_checkout_cb_create_diagnostics_action' );

function fooplugins_freemius_checkout_cb_is_available() {
	return function_exists( 'CB' ) && is_object( CB() ) && method_exists( CB(), 'get_option' ) && method_exists( CB(), 'update_option' );
}

function fooplugins_freemius_checkout_cb_get_custom_events() {
	if ( ! fooplugins_freemius_checkout_cb_is_available() ) {
		return array();
	}
	$events = CB()->get_option( 'custom_events', array() );
	return is_array( $events ) ? array_values( $events ) : array();
}

function fooplugins_freemius_checkout_cb_update_custom_events( $events ) {
	if ( ! fooplugins_freemius_checkout_cb_is_available() ) {
		return false;
	}
	CB()->update_option( 'custom_events', array_values( $events ) );
	return true;
}

function fooplugins_freemius_checkout_cb_get_products() {
	$config = fooplugins_freemius_checkout_get_config();
	return ! empty( $config['plugins'] ) && is_array( $config['plugins'] ) ? $config['plugins'] : array();
}

function fooplugins_freemius_checkout_cb_get_product( $product_slug ) {
	foreach ( fooplugins_freemius_checkout_cb_get_products() as $product ) {
		if ( ! empty( $product['product_slug'] ) && $product['product_slug'] === $product_slug ) {
			return $product;
		}
	}
	return null;
}

function fooplugins_freemius_checkout_cb_get_active_product_slug() {
	$products = fooplugins_freemius_checkout_cb_get_products();
	$slug     = isset( $_GET['product'] ) ? sanitize_text_field( wp_unslash( $_GET['product'] ) ) : '';
	$product  = $slug ? fooplugins_freemius_checkout_cb_get_product( $slug ) : null;

	if ( ! empty( $product['product_slug'] ) ) {
		return $product['product_slug'];
	}

	return ! empty( $products[0]['product_slug'] ) ? $products[0]['product_slug'] : '';
}

function fooplugins_freemius_checkout_cb_event_name( $product_slug, $event_name ) {
	return $product_slug . '_' . $event_name;
}

function fooplugins_freemius_checkout_cb_event_id( $product, $requirement, $definition ) {
	return FOOPLUGINS_FREEMIUS_CHECKOUT_CB_EVENT_ID_PREFIX . md5( $product['product_slug'] . '|' . $requirement . '|' . $definition['event'] );
}

function fooplugins_freemius_checkout_cb_source_parameters() {
	return array(
		'attempt_id'             => '%%e.detail.attempt_id%%',
		'checkout_id'            => '%%e.detail.checkout_id%%',
		'source_context_version' => '%%e.detail.source_context_version%%',
		'source_page'            => '%%e.detail.source_page%%',
		'source_cohort'          => '%%e.detail.source_cohort%%',
		'source_created_at'      => '%%e.detail.source_created_at%%',
	);
}

function fooplugins_freemius_checkout_cb_common_parameters( $product ) {
	return array_merge(
		fooplugins_freemius_checkout_cb_source_parameters(),
		array(
			'product_slug'   => '%%e.detail.product_slug%%',
			'plan_slug'      => '%%e.detail.plan_slug%%',
			'checkout_stage' => '%%e.detail.checkout_stage%%',
			'billing_cycle'  => '%%e.detail.billing_cycle%%',
			'licenses'       => '%%e.detail.licenses%%',
			'coupon'         => '%%e.detail.coupon%%',
		)
	);
}

function fooplugins_freemius_checkout_cb_purchase_parameters( $product ) {
	return array_merge(
		fooplugins_freemius_checkout_cb_common_parameters( $product ),
		array(
			'transaction_id' => '%%e.detail.transaction_id%%',
			'currency'       => '%%e.detail.currency%%',
			'value'          => '%%e.detail.value%%',
			'item_id'        => '%%e.detail.item_id%%',
			'item_name'      => '%%e.detail.item_name%%',
			'item_variant'   => '%%e.detail.item_variant%%',
			'quantity'       => '%%e.detail.quantity%%',
			'items'          => '%%e.detail.items%%',
		)
	);
}

function fooplugins_freemius_checkout_cb_diagnostic_common_parameters() {
	return array_merge(
		fooplugins_freemius_checkout_cb_source_parameters(),
		array(
			'product_id'    => '%%e.detail.product_id%%',
			'plan_id'       => '%%e.detail.plan_id%%',
			'licenses'      => '%%e.detail.licenses%%',
			'billing_cycle' => '%%e.detail.billing_cycle%%',
			'is_trial'      => '%%e.detail.is_trial%%',
			'cta_location'  => '%%e.detail.cta_location%%',
			'checkout_mode' => '%%e.detail.checkout_mode%%',
		)
	);
}

function fooplugins_freemius_checkout_cb_diagnostic_events() {
	$common = fooplugins_freemius_checkout_cb_diagnostic_common_parameters();

	return array(
		'checkout_attempt' => array(
			'label'       => __( 'Checkout attempt', 'fooplugins-freemius-checkout' ),
			'description' => __( 'A valid checkout link was accepted for modal opening.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'fooplugins_checkout_attempt',
			'selector'    => 'document',
			'event'       => 'fooplugins_checkout_attempt',
			'value'       => '',
			'parameters'  => $common,
		),
		'checkout_opened' => array(
			'label'       => __( 'Checkout visibly opened', 'fooplugins-freemius-checkout' ),
			'description' => __( 'The Freemius checkout iframe became visible with non-zero dimensions.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'fooplugins_checkout_opened',
			'selector'    => 'document',
			'event'       => 'fooplugins_checkout_opened',
			'value'       => '',
			'parameters'  => array_merge(
				$common,
				array( 'checkout_load_ms' => '%%e.detail.checkout_load_ms%%' )
			),
		),
		'checkout_open_failed' => array(
			'label'       => __( 'Checkout open failed', 'fooplugins-freemius-checkout' ),
			'description' => __( 'Modal opening failed and the visitor was sent to hosted checkout.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'fooplugins_checkout_open_failed',
			'selector'    => 'document',
			'event'       => 'fooplugins_checkout_open_failed',
			'value'       => '',
			'parameters'  => array_merge(
				$common,
				array(
					'failure_stage'    => '%%e.detail.failure_stage%%',
					'error_code'       => '%%e.detail.error_code%%',
					'checkout_load_ms' => '%%e.detail.checkout_load_ms%%',
				)
			),
		),
		'checkout_cancelled' => array(
			'label'       => __( 'Checkout cancelled', 'fooplugins-freemius-checkout' ),
			'description' => __( 'The visitor closed a visibly opened Freemius checkout.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'fooplugins_checkout_cancelled',
			'selector'    => 'document',
			'event'       => 'fooplugins_checkout_cancelled',
			'value'       => '',
			'parameters'  => array_merge(
				$common,
				array( 'checkout_open_duration_ms' => '%%e.detail.checkout_open_duration_ms%%' )
			),
		),
	);
}

function fooplugins_freemius_checkout_cb_diagnostic_event_id( $requirement, $definition ) {
	return FOOPLUGINS_FREEMIUS_CHECKOUT_CB_EVENT_ID_PREFIX . md5( 'diagnostic|' . $requirement . '|' . $definition['event'] );
}

function fooplugins_freemius_checkout_cb_build_diagnostic_event( $requirement, $definition ) {
	return array(
		'id'         => fooplugins_freemius_checkout_cb_diagnostic_event_id( $requirement, $definition ),
		'trigger'    => $definition['trigger'],
		'type'       => $definition['type'],
		'selector'   => $definition['selector'],
		'event'      => $definition['event'],
		'label'      => 'Freemius Checkout - ' . $definition['label'],
		'value'      => $definition['value'],
		'parameters' => $definition['parameters'],
	);
}

function fooplugins_freemius_checkout_cb_get_diagnostic_matches( $events, $definitions ) {
	$matches = array_fill_keys( array_keys( $definitions ), array() );
	foreach ( $events as $index => $event ) {
		$normalized = function_exists( 'cb_normalize_custom_event' ) ? cb_normalize_custom_event( $event ) : $event;
		foreach ( $definitions as $requirement => $definition ) {
			$owned_id = ! empty( $normalized['id'] ) && fooplugins_freemius_checkout_cb_diagnostic_event_id( $requirement, $definition ) === $normalized['id'];
			$same_event = ! empty( $normalized['event'] ) && $definition['event'] === $normalized['event'];
			if ( $owned_id || $same_event ) {
				$matches[ $requirement ][] = array(
					'index' => $index,
					'event' => $normalized,
				);
			}
		}
	}
	return $matches;
}

function fooplugins_freemius_checkout_cb_required_events( $product ) {
	$product_slug = $product['product_slug'];

	return array(
		'checkout_opened'    => array(
			'label'       => __( 'Checkout opened', 'fooplugins-freemius-checkout' ),
			'description' => __( 'Starts the checkout funnel for this product.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'begin_checkout',
			'selector'    => 'document',
			'event'       => fooplugins_freemius_checkout_cb_event_name( $product_slug, 'freemius_checkout_opened' ),
			'value'       => '',
			'parameters'  => fooplugins_freemius_checkout_cb_common_parameters( $product ),
		),
		'review_order'       => array(
			'label'       => __( 'Review order', 'fooplugins-freemius-checkout' ),
			'description' => __( 'Tracks buyers who reach the order review step.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'add_payment_info',
			'selector'    => 'document',
			'event'       => fooplugins_freemius_checkout_cb_event_name( $product_slug, 'freemius_checkout_review_order' ),
			'value'       => '',
			'parameters'  => array_merge(
				fooplugins_freemius_checkout_cb_common_parameters( $product ),
				array(
					'currency' => '%%e.detail.currency%%',
				)
			),
		),
		'purchase_confirmed' => array(
			'label'       => __( 'Purchase confirmed', 'fooplugins-freemius-checkout' ),
			'description' => __( 'Diagnostic event fired when Freemius confirms the purchase.', 'fooplugins-freemius-checkout' ),
			'trigger'     => 'event',
			'type'        => 'freemius_purchase_confirmed',
			'selector'    => 'document',
			'event'       => fooplugins_freemius_checkout_cb_event_name( $product_slug, 'freemius_purchase_confirmed' ),
			'value'       => '',
			'parameters'  => fooplugins_freemius_checkout_cb_purchase_parameters( $product ),
		),
	);
}

function fooplugins_freemius_checkout_cb_build_event( $product, $requirement, $definition ) {
	return array(
		'id'         => fooplugins_freemius_checkout_cb_event_id( $product, $requirement, $definition ),
		'trigger'    => $definition['trigger'],
		'type'       => $definition['type'],
		'selector'   => $definition['selector'],
		'event'      => $definition['event'],
		'label'      => $product['product_name'] . ' - ' . $definition['label'],
		'value'      => $definition['value'],
		'parameters' => $definition['parameters'],
	);
}

function fooplugins_freemius_checkout_cb_event_parameters( $event ) {
	return ! empty( $event['parameters'] ) && is_array( $event['parameters'] ) ? $event['parameters'] : array();
}

function fooplugins_freemius_checkout_cb_event_matches_definition( $event, $product, $requirement, $definition ) {
	if ( function_exists( 'cb_normalize_custom_event' ) ) {
		$event = cb_normalize_custom_event( $event );
	}

	if ( ! empty( $event['id'] ) && fooplugins_freemius_checkout_cb_event_id( $product, $requirement, $definition ) === $event['id'] ) {
		return true;
	}

	return ! empty( $event['event'] ) && $definition['event'] === $event['event'];
}

function fooplugins_freemius_checkout_cb_get_event_matches( $product, $events, $definitions ) {
	$matches = array();
	foreach ( $definitions as $requirement => $definition ) {
		$matches[ $requirement ] = array();
	}

	foreach ( $events as $index => $event ) {
		foreach ( $definitions as $requirement => $definition ) {
			if ( fooplugins_freemius_checkout_cb_event_matches_definition( $event, $product, $requirement, $definition ) ) {
				$matches[ $requirement ][] = array(
					'index' => $index,
					'event' => function_exists( 'cb_normalize_custom_event' ) ? cb_normalize_custom_event( $event ) : $event,
				);
			}
		}
	}

	return $matches;
}

function fooplugins_freemius_checkout_cb_validate_event( $event, $definition ) {
	$issues = array();

	foreach ( array( 'trigger', 'type', 'selector', 'event' ) as $field ) {
		$actual = isset( $event[ $field ] ) ? $event[ $field ] : '';
		if ( $actual !== $definition[ $field ] ) {
			$issues[] = sprintf(
				/* translators: 1: field name, 2: expected value, 3: actual value */
				__( '%1$s should be %2$s, found %3$s.', 'fooplugins-freemius-checkout' ),
				$field,
				$definition[ $field ],
				$actual ? $actual : __( 'empty', 'fooplugins-freemius-checkout' )
			);
		}
	}

	$expected_value = isset( $definition['value'] ) ? $definition['value'] : '';
	$actual_value   = isset( $event['value'] ) ? $event['value'] : '';
	if ( $actual_value !== $expected_value ) {
		$issues[] = sprintf(
			/* translators: 1: expected value, 2: actual value */
			__( 'value should be %1$s, found %2$s.', 'fooplugins-freemius-checkout' ),
			$expected_value ? $expected_value : __( 'blank', 'fooplugins-freemius-checkout' ),
			$actual_value ? $actual_value : __( 'blank', 'fooplugins-freemius-checkout' )
		);
	}

	$parameters = fooplugins_freemius_checkout_cb_event_parameters( $event );
	foreach ( $definition['parameters'] as $key => $expected ) {
		if ( ! array_key_exists( $key, $parameters ) ) {
			$issues[] = sprintf(
				/* translators: %s: parameter key */
				__( 'Missing parameter %s.', 'fooplugins-freemius-checkout' ),
				$key
			);
			continue;
		}
		if ( $parameters[ $key ] !== $expected ) {
			$issues[] = sprintf(
				/* translators: 1: parameter key, 2: expected value, 3: actual value */
				__( 'Parameter %1$s should be %2$s, found %3$s.', 'fooplugins-freemius-checkout' ),
				$key,
				$expected,
				$parameters[ $key ]
			);
		}
	}

	return $issues;
}

function fooplugins_freemius_checkout_cb_product_has_any_matches( $matches ) {
	foreach ( $matches as $requirement_matches ) {
		if ( ! empty( $requirement_matches ) ) {
			return true;
		}
	}
	return false;
}

function fooplugins_freemius_checkout_cb_count_missing( $matches ) {
	$missing = 0;
	foreach ( $matches as $requirement_matches ) {
		if ( empty( $requirement_matches ) ) {
			$missing++;
		}
	}
	return $missing;
}

function fooplugins_freemius_checkout_cb_create_events_action() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to manage these events.', 'fooplugins-freemius-checkout' ) );
	}

	check_admin_referer( 'fooplugins_freemius_checkout_cb_create_events' );

	$product_slug = isset( $_POST['product_slug'] ) ? sanitize_text_field( wp_unslash( $_POST['product_slug'] ) ) : '';
	$product      = fooplugins_freemius_checkout_cb_get_product( $product_slug );
	if ( empty( $product ) || ! fooplugins_freemius_checkout_cb_is_available() ) {
		fooplugins_freemius_checkout_cb_redirect( $product_slug, 'error' );
	}

	$events      = fooplugins_freemius_checkout_cb_get_custom_events();
	$definitions = fooplugins_freemius_checkout_cb_required_events( $product );
	$matches     = fooplugins_freemius_checkout_cb_get_event_matches( $product, $events, $definitions );
	$created     = 0;

	foreach ( $definitions as $requirement => $definition ) {
		if ( ! empty( $matches[ $requirement ] ) ) {
			continue;
		}
		$events[] = fooplugins_freemius_checkout_cb_build_event( $product, $requirement, $definition );
		$created++;
	}

	fooplugins_freemius_checkout_cb_update_custom_events( $events );
	fooplugins_freemius_checkout_cb_redirect( $product_slug, $created ? 'created' : 'none-created', $created );
}

function fooplugins_freemius_checkout_cb_create_diagnostics_action() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to manage checkout diagnostics.', 'fooplugins-freemius-checkout' ) );
	}

	check_admin_referer( 'fooplugins_freemius_checkout_cb_create_diagnostics' );
	if ( ! fooplugins_freemius_checkout_cb_is_available() ) {
		fooplugins_freemius_checkout_cb_redirect( '', 'error' );
	}

	$events      = fooplugins_freemius_checkout_cb_get_custom_events();
	$definitions = fooplugins_freemius_checkout_cb_diagnostic_events();
	$matches     = fooplugins_freemius_checkout_cb_get_diagnostic_matches( $events, $definitions );
	$created     = 0;

	foreach ( $definitions as $requirement => $definition ) {
		if ( ! empty( $matches[ $requirement ] ) ) {
			continue;
		}
		$events[] = fooplugins_freemius_checkout_cb_build_diagnostic_event( $requirement, $definition );
		$created++;
	}

	fooplugins_freemius_checkout_cb_update_custom_events( $events );
	fooplugins_freemius_checkout_cb_redirect( '', $created ? 'created' : 'none-created', $created );
}

function fooplugins_freemius_checkout_cb_delete_event_action() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to manage these events.', 'fooplugins-freemius-checkout' ) );
	}

	check_admin_referer( 'fooplugins_freemius_checkout_cb_delete_event' );

	$product_slug = isset( $_POST['product_slug'] ) ? sanitize_text_field( wp_unslash( $_POST['product_slug'] ) ) : '';
	$event_index  = null;
	if ( isset( $_POST['event_index'] ) ) {
		$raw_event_index = wp_unslash( $_POST['event_index'] );
		if ( is_scalar( $raw_event_index ) && preg_match( '/^\d+$/', (string) $raw_event_index ) ) {
			$event_index = absint( $raw_event_index );
		}
	}
	$product      = fooplugins_freemius_checkout_cb_get_product( $product_slug );
	if ( empty( $product ) || null === $event_index || ! fooplugins_freemius_checkout_cb_is_available() ) {
		fooplugins_freemius_checkout_cb_redirect( $product_slug, 'error' );
	}

	$events      = fooplugins_freemius_checkout_cb_get_custom_events();
	$definitions = fooplugins_freemius_checkout_cb_required_events( $product );
	if ( ! isset( $events[ $event_index ] ) ) {
		fooplugins_freemius_checkout_cb_redirect( $product_slug, 'missing-delete-target' );
	}

	$can_delete = false;
	foreach ( $definitions as $requirement => $definition ) {
		if ( fooplugins_freemius_checkout_cb_event_matches_definition( $events[ $event_index ], $product, $requirement, $definition ) ) {
			$can_delete = true;
			break;
		}
	}

	if ( ! $can_delete ) {
		fooplugins_freemius_checkout_cb_redirect( $product_slug, 'not-owned' );
	}

	unset( $events[ $event_index ] );
	fooplugins_freemius_checkout_cb_update_custom_events( $events );
	fooplugins_freemius_checkout_cb_redirect( $product_slug, 'deleted' );
}

function fooplugins_freemius_checkout_cb_redirect( $product_slug, $message, $count = 0, $tab = 'conversion_bridge' ) {
	fooplugins_freemius_checkout_admin_redirect( $tab, $message, $count, $product_slug );
}

function fooplugins_freemius_checkout_cb_render_diagnostics_panel() {
	$definitions = fooplugins_freemius_checkout_cb_diagnostic_events();
	$events      = fooplugins_freemius_checkout_cb_get_custom_events();
	$matches     = fooplugins_freemius_checkout_cb_get_diagnostic_matches( $events, $definitions );
	$missing     = fooplugins_freemius_checkout_cb_count_missing( $matches );
	?>
	<div class="fooplugins-freemius-cb__panel">
		<h2><?php esc_html_e( 'Checkout reliability diagnostics', 'fooplugins-freemius-checkout' ); ?></h2>
		<p><?php esc_html_e( 'These four global events measure accepted checkout attempts, visibly opened modals, hosted-checkout fallbacks, and cancellations without duplicating them for every product.', 'fooplugins-freemius-checkout' ); ?></p>

		<?php if ( ! fooplugins_freemius_checkout_cb_is_available() ) : ?>
			<div class="notice notice-error inline"><p><?php esc_html_e( 'Conversion Bridge is not active or is not loaded.', 'fooplugins-freemius-checkout' ); ?></p></div>
		<?php elseif ( $missing > 0 ) : ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'fooplugins_freemius_checkout_cb_create_diagnostics' ); ?>
				<input type="hidden" name="action" value="fooplugins_freemius_checkout_cb_create_diagnostics" />
				<?php submit_button( __( 'Create missing diagnostic events', 'fooplugins-freemius-checkout' ), 'primary', 'submit', false ); ?>
			</form>
		<?php else : ?>
			<p><strong><?php esc_html_e( 'All checkout diagnostic events exist.', 'fooplugins-freemius-checkout' ); ?></strong></p>
		<?php endif; ?>

		<table class="widefat striped fooplugins-freemius-cb__table">
			<thead><tr>
				<th><?php esc_html_e( 'Diagnostic', 'fooplugins-freemius-checkout' ); ?></th>
				<th><?php esc_html_e( 'JavaScript event', 'fooplugins-freemius-checkout' ); ?></th>
				<th><?php esc_html_e( 'Status', 'fooplugins-freemius-checkout' ); ?></th>
				<th><?php esc_html_e( 'Validation', 'fooplugins-freemius-checkout' ); ?></th>
			</tr></thead>
			<tbody>
			<?php foreach ( $definitions as $requirement => $definition ) : ?>
				<?php
				$requirement_matches = $matches[ $requirement ];
				$issues              = array();
				if ( ! empty( $requirement_matches ) ) {
					$issues = fooplugins_freemius_checkout_cb_validate_event( $requirement_matches[0]['event'], $definition );
					if ( count( $requirement_matches ) > 1 ) {
						$issues[] = __( 'Duplicate event for this diagnostic.', 'fooplugins-freemius-checkout' );
					}
				}
				?>
				<tr>
					<td><strong><?php echo esc_html( $definition['label'] ); ?></strong><p class="description"><?php echo esc_html( $definition['description'] ); ?></p></td>
					<td><code><?php echo esc_html( $definition['event'] ); ?></code></td>
					<td>
						<?php if ( empty( $requirement_matches ) ) : ?>
							<span class="fooplugins-freemius-cb__status is-missing"><?php esc_html_e( 'Missing', 'fooplugins-freemius-checkout' ); ?></span>
						<?php elseif ( empty( $issues ) ) : ?>
							<span class="fooplugins-freemius-cb__status is-valid"><?php esc_html_e( 'Valid', 'fooplugins-freemius-checkout' ); ?></span>
						<?php else : ?>
							<span class="fooplugins-freemius-cb__status is-warning"><?php esc_html_e( 'Needs attention', 'fooplugins-freemius-checkout' ); ?></span>
						<?php endif; ?>
					</td>
					<td>
						<?php if ( empty( $requirement_matches ) ) : ?>
							<?php esc_html_e( 'No matching Conversion Bridge event was found.', 'fooplugins-freemius-checkout' ); ?>
						<?php elseif ( empty( $issues ) ) : ?>
							<?php esc_html_e( 'Configuration matches the required diagnostic event.', 'fooplugins-freemius-checkout' ); ?>
						<?php else : ?>
							<ul class="fooplugins-freemius-cb__issues"><?php foreach ( $issues as $issue ) : ?><li><?php echo esc_html( $issue ); ?></li><?php endforeach; ?></ul>
						<?php endif; ?>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
	</div>
	<?php
}

function fooplugins_freemius_checkout_cb_render_tab() {
	fooplugins_freemius_checkout_cb_render_diagnostics_panel();

	$products    = fooplugins_freemius_checkout_cb_get_products();
	$active_slug = fooplugins_freemius_checkout_cb_get_active_product_slug();
	$active      = $active_slug ? fooplugins_freemius_checkout_cb_get_product( $active_slug ) : null;
	if ( empty( $active ) && ! empty( $products ) ) {
		$active = $products[0];
	}

	if ( empty( $products ) ) {
		?>
		<div class="notice notice-warning"><p><?php esc_html_e( 'No Freemius products are configured.', 'fooplugins-freemius-checkout' ); ?></p></div>
		<?php
		return;
	}

	$definitions = fooplugins_freemius_checkout_cb_required_events( $active );
	$events      = fooplugins_freemius_checkout_cb_get_custom_events();
	$matches     = fooplugins_freemius_checkout_cb_get_event_matches( $active, $events, $definitions );
	$missing     = fooplugins_freemius_checkout_cb_count_missing( $matches );
	$has_matches = fooplugins_freemius_checkout_cb_product_has_any_matches( $matches );
	?>
	<div class="fooplugins-freemius-cb__panel">
		<h2><?php esc_html_e( 'Conversion Bridge events', 'fooplugins-freemius-checkout' ); ?></h2>
		<p><?php esc_html_e( 'Create and validate the Conversion Bridge custom events required for a configured Freemius product.', 'fooplugins-freemius-checkout' ); ?></p>

		<?php if ( ! fooplugins_freemius_checkout_cb_is_available() ) : ?>
			<div class="notice notice-error inline">
				<p><?php esc_html_e( 'Conversion Bridge is not active or is not loaded. Activate Conversion Bridge before creating custom events.', 'fooplugins-freemius-checkout' ); ?></p>
			</div>
		<?php endif; ?>

		<form class="fooplugins-freemius-cb__product-form" method="get" action="<?php echo esc_url( admin_url( 'options-general.php' ) ); ?>">
			<input type="hidden" name="page" value="<?php echo esc_attr( FOOPLUGINS_FREEMIUS_CHECKOUT_ADMIN_PAGE_SLUG ); ?>" />
			<input type="hidden" name="tab" value="conversion_bridge" />
			<label for="fooplugins-freemius-cb-product"><strong><?php esc_html_e( 'Product', 'fooplugins-freemius-checkout' ); ?></strong></label>
			<select id="fooplugins-freemius-cb-product" name="product">
				<?php foreach ( $products as $product ) : ?>
					<option value="<?php echo esc_attr( $product['product_slug'] ); ?>" <?php selected( $active['product_slug'], $product['product_slug'] ); ?>>
						<?php echo esc_html( $product['product_name'] ); ?>
					</option>
				<?php endforeach; ?>
			</select>
			<?php submit_button( __( 'View product', 'fooplugins-freemius-checkout' ), 'secondary', 'submit', false ); ?>
		</form>

		<div class="fooplugins-freemius-cb__summary">
			<h3><?php echo esc_html( $active['product_name'] ); ?></h3>
			<p>
				<?php esc_html_e( 'Product slug:', 'fooplugins-freemius-checkout' ); ?>
				<code><?php echo esc_html( $active['product_slug'] ); ?></code>
				<?php esc_html_e( 'Default plan:', 'fooplugins-freemius-checkout' ); ?>
				<code><?php echo esc_html( ! empty( $active['default_plan'] ) ? $active['default_plan'] : 'default_plan' ); ?></code>
			</p>
			<p>
				<?php
				printf(
					/* translators: 1: missing count, 2: total count */
					esc_html__( '%1$d of %2$d required events are missing.', 'fooplugins-freemius-checkout' ),
					absint( $missing ),
					absint( count( $definitions ) )
				);
				?>
			</p>
			<?php if ( fooplugins_freemius_checkout_cb_is_available() && $missing > 0 ) : ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<?php wp_nonce_field( 'fooplugins_freemius_checkout_cb_create_events' ); ?>
					<input type="hidden" name="action" value="fooplugins_freemius_checkout_cb_create_events" />
					<input type="hidden" name="product_slug" value="<?php echo esc_attr( $active['product_slug'] ); ?>" />
					<?php
					$button_label = $has_matches
						? __( 'Create missing events', 'fooplugins-freemius-checkout' )
						: __( 'Create all required events', 'fooplugins-freemius-checkout' );
					submit_button( $button_label, 'primary', 'submit', false );
					?>
				</form>
			<?php elseif ( fooplugins_freemius_checkout_cb_is_available() ) : ?>
				<p><strong><?php esc_html_e( 'All required events exist for this product.', 'fooplugins-freemius-checkout' ); ?></strong></p>
			<?php endif; ?>
		</div>

		<table class="widefat striped fooplugins-freemius-cb__table">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Requirement', 'fooplugins-freemius-checkout' ); ?></th>
					<th><?php esc_html_e( 'JavaScript event', 'fooplugins-freemius-checkout' ); ?></th>
					<th><?php esc_html_e( 'Conversion Bridge type', 'fooplugins-freemius-checkout' ); ?></th>
					<th><?php esc_html_e( 'Status', 'fooplugins-freemius-checkout' ); ?></th>
					<th><?php esc_html_e( 'Validation', 'fooplugins-freemius-checkout' ); ?></th>
					<th><?php esc_html_e( 'Actions', 'fooplugins-freemius-checkout' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $definitions as $requirement => $definition ) : ?>
					<?php if ( empty( $matches[ $requirement ] ) ) : ?>
						<tr>
							<td>
								<strong><?php echo esc_html( $definition['label'] ); ?></strong>
								<p class="description"><?php echo esc_html( $definition['description'] ); ?></p>
							</td>
							<td><code><?php echo esc_html( $definition['event'] ); ?></code></td>
							<td><code><?php echo esc_html( $definition['type'] ); ?></code></td>
							<td><span class="fooplugins-freemius-cb__status is-missing"><?php esc_html_e( 'Missing', 'fooplugins-freemius-checkout' ); ?></span></td>
							<td><?php esc_html_e( 'No matching Conversion Bridge custom event was found.', 'fooplugins-freemius-checkout' ); ?></td>
							<td></td>
						</tr>
						<?php continue; ?>
					<?php endif; ?>

					<?php foreach ( $matches[ $requirement ] as $match ) : ?>
						<?php
						$issues = fooplugins_freemius_checkout_cb_validate_event( $match['event'], $definition );
						if ( count( $matches[ $requirement ] ) > 1 ) {
							$issues[] = __( 'Duplicate event for this requirement.', 'fooplugins-freemius-checkout' );
						}
						$is_valid = empty( $issues );
						?>
						<tr>
							<td>
								<strong><?php echo esc_html( $definition['label'] ); ?></strong>
								<p class="description"><?php echo esc_html( $definition['description'] ); ?></p>
							</td>
							<td><code><?php echo esc_html( isset( $match['event']['event'] ) ? $match['event']['event'] : '' ); ?></code></td>
							<td><code><?php echo esc_html( isset( $match['event']['type'] ) ? $match['event']['type'] : '' ); ?></code></td>
							<td>
								<?php if ( $is_valid ) : ?>
									<span class="fooplugins-freemius-cb__status is-valid"><?php esc_html_e( 'Valid', 'fooplugins-freemius-checkout' ); ?></span>
								<?php else : ?>
									<span class="fooplugins-freemius-cb__status is-warning"><?php esc_html_e( 'Needs attention', 'fooplugins-freemius-checkout' ); ?></span>
								<?php endif; ?>
							</td>
							<td>
								<?php if ( $is_valid ) : ?>
									<?php esc_html_e( 'Configuration matches the required event.', 'fooplugins-freemius-checkout' ); ?>
								<?php else : ?>
									<ul class="fooplugins-freemius-cb__issues">
										<?php foreach ( $issues as $issue ) : ?>
											<li><?php echo esc_html( $issue ); ?></li>
										<?php endforeach; ?>
									</ul>
								<?php endif; ?>
							</td>
							<td>
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('<?php echo esc_js( __( 'Delete this Conversion Bridge custom event?', 'fooplugins-freemius-checkout' ) ); ?>');">
									<?php wp_nonce_field( 'fooplugins_freemius_checkout_cb_delete_event' ); ?>
									<input type="hidden" name="action" value="fooplugins_freemius_checkout_cb_delete_event" />
									<input type="hidden" name="product_slug" value="<?php echo esc_attr( $active['product_slug'] ); ?>" />
									<input type="hidden" name="event_index" value="<?php echo esc_attr( $match['index'] ); ?>" />
									<?php submit_button( __( 'Delete', 'fooplugins-freemius-checkout' ), 'delete small', 'submit', false ); ?>
								</form>
							</td>
						</tr>
					<?php endforeach; ?>
				<?php endforeach; ?>
			</tbody>
		</table>
	</div>
	<?php
}
