<?php

defined( 'ABSPATH' ) || exit;

define( 'FOOPLUGINS_FREEMIUS_CHECKOUT_ADMIN_PAGE_SLUG', 'fooplugins-freemius-conversion-bridge' );

require_once __DIR__ . '/conversion-bridge-admin.php';

add_action( 'admin_menu', 'fooplugins_freemius_checkout_admin_menu' );
add_action( 'admin_post_fooplugins_freemius_checkout_save_checkout_defaults', 'fooplugins_freemius_checkout_save_checkout_defaults_action' );

function fooplugins_freemius_checkout_admin_menu() {
	add_options_page(
		__( 'Freemius Checkout', 'fooplugins-freemius-checkout' ),
		__( 'Freemius Checkout', 'fooplugins-freemius-checkout' ),
		'manage_options',
		FOOPLUGINS_FREEMIUS_CHECKOUT_ADMIN_PAGE_SLUG,
		'fooplugins_freemius_checkout_render_admin_page'
	);
}

function fooplugins_freemius_checkout_admin_url( $tab = 'checkout', $product_slug = '' ) {
	$args = array(
		'page' => FOOPLUGINS_FREEMIUS_CHECKOUT_ADMIN_PAGE_SLUG,
		'tab'  => fooplugins_freemius_checkout_sanitize_admin_tab( $tab ),
	);
	if ( ! empty( $product_slug ) ) {
		$args['product'] = sanitize_text_field( $product_slug );
	}
	return add_query_arg( $args, admin_url( 'options-general.php' ) );
}

function fooplugins_freemius_checkout_sanitize_admin_tab( $tab ) {
	$tab = sanitize_key( $tab );
	return in_array( $tab, array( 'checkout', 'conversion_bridge', 'debug' ), true ) ? $tab : 'checkout';
}

function fooplugins_freemius_checkout_sanitize_admin_message( $message ) {
	$message = sanitize_key( $message );
	return in_array(
		$message,
		array(
			'checkout-saved',
			'created',
			'none-created',
			'deleted',
			'missing-delete-target',
			'not-owned',
			'error',
		),
		true
	) ? $message : 'error';
}

function fooplugins_freemius_checkout_get_active_admin_tab() {
	return isset( $_GET['tab'] )
		? fooplugins_freemius_checkout_sanitize_admin_tab( wp_unslash( $_GET['tab'] ) )
		: 'checkout';
}

function fooplugins_freemius_checkout_get_posted_checkout_defaults() {
	$rows = isset( $_POST['checkout_defaults'] ) && is_array( $_POST['checkout_defaults'] )
		? wp_unslash( $_POST['checkout_defaults'] )
		: array();
	$defaults = array();

	foreach ( $rows as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}

		$key = isset( $row['key'] ) ? (string) $row['key'] : '';
		if ( '' === trim( $key ) ) {
			continue;
		}

		$defaults[ $key ] = isset( $row['value'] ) ? (string) $row['value'] : '';
	}

	return fooplugins_freemius_checkout_sanitize_checkout_defaults( $defaults );
}

function fooplugins_freemius_checkout_save_checkout_defaults_action() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to manage checkout defaults.', 'fooplugins-freemius-checkout' ) );
	}

	check_admin_referer( 'fooplugins_freemius_checkout_save_checkout_defaults' );

	fooplugins_freemius_checkout_update_checkout_defaults(
		fooplugins_freemius_checkout_get_posted_checkout_defaults()
	);

	fooplugins_freemius_checkout_admin_redirect( 'checkout', 'checkout-saved' );
}

function fooplugins_freemius_checkout_admin_redirect( $tab, $message, $count = 0, $product_slug = '' ) {
	$args = array(
		'fooplugins_message' => fooplugins_freemius_checkout_sanitize_admin_message( $message ),
	);
	if ( $count ) {
		$args['count'] = absint( $count );
	}
	wp_safe_redirect( add_query_arg( $args, fooplugins_freemius_checkout_admin_url( $tab, $product_slug ) ) );
	exit;
}

function fooplugins_freemius_checkout_render_notice() {
	$message = isset( $_GET['fooplugins_message'] ) ? fooplugins_freemius_checkout_sanitize_admin_message( wp_unslash( $_GET['fooplugins_message'] ) ) : '';
	if ( empty( $message ) ) {
		return;
	}

	$count = isset( $_GET['count'] ) ? absint( $_GET['count'] ) : 0;
	$type  = 'success';
	$text  = '';

	if ( 'checkout-saved' === $message ) {
		$text = __( 'Saved checkout defaults.', 'fooplugins-freemius-checkout' );
	} elseif ( 'created' === $message ) {
		$text = sprintf(
			/* translators: %d: number of created events */
			_n( 'Created %d Conversion Bridge custom event.', 'Created %d Conversion Bridge custom events.', $count, 'fooplugins-freemius-checkout' ),
			$count
		);
	} elseif ( 'none-created' === $message ) {
		$text = __( 'No events were created because the required events already exist.', 'fooplugins-freemius-checkout' );
	} elseif ( 'deleted' === $message ) {
		$text = __( 'Deleted the Conversion Bridge custom event.', 'fooplugins-freemius-checkout' );
	} elseif ( 'missing-delete-target' === $message ) {
		$type = 'error';
		$text = __( 'The selected custom event no longer exists.', 'fooplugins-freemius-checkout' );
	} elseif ( 'not-owned' === $message ) {
		$type = 'error';
		$text = __( 'That event does not match this product and was not deleted.', 'fooplugins-freemius-checkout' );
	} elseif ( 'error' === $message ) {
		$type = 'error';
		$text = __( 'The requested action could not be completed.', 'fooplugins-freemius-checkout' );
	}

	if ( empty( $text ) ) {
		return;
	}
	?>
	<div class="notice notice-<?php echo esc_attr( $type ); ?> is-dismissible">
		<p><?php echo esc_html( $text ); ?></p>
	</div>
	<?php
}

function fooplugins_freemius_checkout_render_admin_tabs( $active_tab, $active_product_slug = '' ) {
	?>
	<nav class="nav-tab-wrapper" aria-label="<?php esc_attr_e( 'Freemius checkout settings', 'fooplugins-freemius-checkout' ); ?>">
		<a class="nav-tab<?php echo 'checkout' === $active_tab ? ' nav-tab-active' : ''; ?>" href="<?php echo esc_url( fooplugins_freemius_checkout_admin_url( 'checkout' ) ); ?>">
			<?php esc_html_e( 'Checkout', 'fooplugins-freemius-checkout' ); ?>
		</a>
		<a class="nav-tab<?php echo 'conversion_bridge' === $active_tab ? ' nav-tab-active' : ''; ?>" href="<?php echo esc_url( fooplugins_freemius_checkout_admin_url( 'conversion_bridge', $active_product_slug ) ); ?>">
			<?php esc_html_e( 'Conversion Bridge', 'fooplugins-freemius-checkout' ); ?>
		</a>
		<a class="nav-tab<?php echo 'debug' === $active_tab ? ' nav-tab-active' : ''; ?>" href="<?php echo esc_url( fooplugins_freemius_checkout_admin_url( 'debug' ) ); ?>">
			<?php esc_html_e( 'Debug', 'fooplugins-freemius-checkout' ); ?>
		</a>
	</nav>
	<?php
}

function fooplugins_freemius_checkout_get_frontend_config_debug_output() {
	$config = fooplugins_freemius_checkout_get_config();
	foreach ( $config as $key => $value ) {
		if ( is_scalar( $value ) ) {
			$config[ $key ] = html_entity_decode( (string) $value, ENT_QUOTES, 'UTF-8' );
		}
	}

	return 'var FOOCHECKOUT = ' . wp_json_encode( $config, JSON_HEX_TAG | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . ';';
}

function fooplugins_freemius_checkout_render_debug_tab() {
	?>
	<div class="fooplugins-freemius-cb__panel">
		<h2><?php esc_html_e( 'Frontend config', 'fooplugins-freemius-checkout' ); ?></h2>
		<p><?php esc_html_e( 'This is a readable version of the global JavaScript configuration emitted before the frontend checkout script. The frontend output itself is unchanged.', 'fooplugins-freemius-checkout' ); ?></p>
		<label class="screen-reader-text" for="fooplugins-freemius-debug-config"><?php esc_html_e( 'Frontend JavaScript configuration', 'fooplugins-freemius-checkout' ); ?></label>
		<textarea id="fooplugins-freemius-debug-config" class="large-text code fooplugins-freemius-cb__debug-output" rows="24" readonly><?php echo esc_textarea( fooplugins_freemius_checkout_get_frontend_config_debug_output() ); ?></textarea>
	</div>
	<?php
}

function fooplugins_freemius_checkout_render_checkout_tab() {
	$defaults = fooplugins_freemius_checkout_get_checkout_defaults();
	$rows     = array();
	foreach ( $defaults as $key => $value ) {
		$rows[] = array(
			'key'   => $key,
			'value' => $value,
		);
	}
	?>
	<div class="fooplugins-freemius-cb__panel">
		<h2><?php esc_html_e( 'Checkout defaults', 'fooplugins-freemius-checkout' ); ?></h2>
		<p><?php esc_html_e( 'These key/value pairs are included with every Freemius checkout open call. Checkout links can still provide product, plan, license, coupon, and other URL-specific values.', 'fooplugins-freemius-checkout' ); ?></p>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'fooplugins_freemius_checkout_save_checkout_defaults' ); ?>
			<input type="hidden" name="action" value="fooplugins_freemius_checkout_save_checkout_defaults" />

			<table class="widefat striped fooplugins-freemius-cb__defaults-table" id="fooplugins-freemius-checkout-defaults">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Key', 'fooplugins-freemius-checkout' ); ?></th>
						<th><?php esc_html_e( 'Value', 'fooplugins-freemius-checkout' ); ?></th>
						<th><?php esc_html_e( 'Actions', 'fooplugins-freemius-checkout' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $rows as $index => $row ) : ?>
						<tr>
							<td>
								<label class="screen-reader-text" for="fooplugins-checkout-default-key-<?php echo esc_attr( $index ); ?>"><?php esc_html_e( 'Checkout setting key', 'fooplugins-freemius-checkout' ); ?></label>
								<input class="regular-text" id="fooplugins-checkout-default-key-<?php echo esc_attr( $index ); ?>" type="text" name="checkout_defaults[<?php echo esc_attr( $index ); ?>][key]" value="<?php echo esc_attr( $row['key'] ); ?>" placeholder="<?php esc_attr_e( 'show_upsells', 'fooplugins-freemius-checkout' ); ?>" />
							</td>
							<td>
								<label class="screen-reader-text" for="fooplugins-checkout-default-value-<?php echo esc_attr( $index ); ?>"><?php esc_html_e( 'Checkout setting value', 'fooplugins-freemius-checkout' ); ?></label>
								<input class="regular-text" id="fooplugins-checkout-default-value-<?php echo esc_attr( $index ); ?>" type="text" name="checkout_defaults[<?php echo esc_attr( $index ); ?>][value]" value="<?php echo esc_attr( $row['value'] ); ?>" placeholder="<?php esc_attr_e( 'false', 'fooplugins-freemius-checkout' ); ?>" />
							</td>
							<td><button type="button" class="button" data-fooplugins-remove-default><?php esc_html_e( 'Remove', 'fooplugins-freemius-checkout' ); ?></button></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>

			<p><button type="button" class="button" id="fooplugins-add-checkout-default"><?php esc_html_e( 'Add setting', 'fooplugins-freemius-checkout' ); ?></button></p>
			<?php submit_button( __( 'Save checkout defaults', 'fooplugins-freemius-checkout' ) ); ?>
		</form>
	</div>

	<script>
	(function(){
		const table = document.getElementById("fooplugins-freemius-checkout-defaults");
		const addButton = document.getElementById("fooplugins-add-checkout-default");
		if (!table || !addButton) return;
		const tbody = table.querySelector("tbody");
		let nextIndex = tbody.querySelectorAll("tr").length;
		const labels = {
			key: <?php echo wp_json_encode( __( 'Checkout setting key', 'fooplugins-freemius-checkout' ), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT ); ?>,
			value: <?php echo wp_json_encode( __( 'Checkout setting value', 'fooplugins-freemius-checkout' ), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT ); ?>,
			remove: <?php echo wp_json_encode( __( 'Remove', 'fooplugins-freemius-checkout' ), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT ); ?>
		};

		function createRow(index){
			const row = document.createElement("tr");
			const keyCell = document.createElement("td");
			const valueCell = document.createElement("td");
			const actionCell = document.createElement("td");
			const keyLabel = document.createElement("label");
			const valueLabel = document.createElement("label");
			const keyInput = document.createElement("input");
			const valueInput = document.createElement("input");
			const removeButton = document.createElement("button");

			keyLabel.className = "screen-reader-text";
			keyLabel.setAttribute("for", "fooplugins-checkout-default-key-" + index);
			keyLabel.textContent = labels.key;

			keyInput.className = "regular-text";
			keyInput.id = "fooplugins-checkout-default-key-" + index;
			keyInput.type = "text";
			keyInput.name = "checkout_defaults[" + index + "][key]";
			keyInput.placeholder = "show_upsells";

			valueLabel.className = "screen-reader-text";
			valueLabel.setAttribute("for", "fooplugins-checkout-default-value-" + index);
			valueLabel.textContent = labels.value;

			valueInput.className = "regular-text";
			valueInput.id = "fooplugins-checkout-default-value-" + index;
			valueInput.type = "text";
			valueInput.name = "checkout_defaults[" + index + "][value]";
			valueInput.placeholder = "false";

			removeButton.type = "button";
			removeButton.className = "button";
			removeButton.setAttribute("data-fooplugins-remove-default", "");
			removeButton.textContent = labels.remove;

			keyCell.append(keyLabel, keyInput);
			valueCell.append(valueLabel, valueInput);
			actionCell.append(removeButton);
			row.append(keyCell, valueCell, actionCell);
			return row;
		}

		addButton.addEventListener("click", function(){
			const row = createRow(nextIndex);
			nextIndex++;
			tbody.appendChild(row);
			row.querySelector("input").focus();
		});

		tbody.addEventListener("click", function(event){
			if (!event.target.matches("[data-fooplugins-remove-default]")) return;
			const row = event.target.closest("tr");
			if (row) row.remove();
		});
	})();
	</script>
	<?php
}

function fooplugins_freemius_checkout_render_admin_styles() {
	?>
	<style>
		.fooplugins-freemius-cb .nav-tab-wrapper {
			margin-top: 16px;
		}
		.fooplugins-freemius-cb__panel,
		.fooplugins-freemius-cb__summary {
			background: #fff;
			border: 1px solid #c3c4c7;
			margin: 16px 0;
			padding: 16px;
			max-width: 1280px;
		}
		.fooplugins-freemius-cb__panel h2,
		.fooplugins-freemius-cb__summary h3 {
			margin-top: 0;
		}
		.fooplugins-freemius-cb__product-form {
			align-items: center;
			display: flex;
			gap: 8px;
			margin: 16px 0;
		}
		.fooplugins-freemius-cb__product-form select {
			min-width: 260px;
		}
		.fooplugins-freemius-cb__defaults-table {
			max-width: 900px;
		}
		.fooplugins-freemius-cb__defaults-table th:last-child,
		.fooplugins-freemius-cb__defaults-table td:last-child {
			width: 120px;
		}
		.fooplugins-freemius-cb__table {
			max-width: 1280px;
		}
		.fooplugins-freemius-cb__debug-output {
			font-family: Consolas, Monaco, monospace;
			min-height: 480px;
			white-space: pre;
		}
		.fooplugins-freemius-cb__status {
			border-radius: 3px;
			display: inline-block;
			font-size: 12px;
			font-weight: 600;
			line-height: 1.5;
			padding: 2px 6px;
		}
		.fooplugins-freemius-cb__status.is-valid {
			background: #edfaef;
			color: #0a7f20;
		}
		.fooplugins-freemius-cb__status.is-warning {
			background: #fcf9e8;
			color: #8a5a00;
		}
		.fooplugins-freemius-cb__status.is-missing {
			background: #f6f7f7;
			color: #50575e;
		}
		.fooplugins-freemius-cb__issues {
			margin: 0;
		}
		.fooplugins-freemius-cb__issues li {
			margin-left: 16px;
		}
	</style>
	<?php
}

function fooplugins_freemius_checkout_render_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to view this page.', 'fooplugins-freemius-checkout' ) );
	}

	$active_tab          = fooplugins_freemius_checkout_get_active_admin_tab();
	$active_product_slug = function_exists( 'fooplugins_freemius_checkout_cb_get_active_product_slug' )
		? fooplugins_freemius_checkout_cb_get_active_product_slug()
		: '';
	?>
	<div class="wrap fooplugins-freemius-cb">
		<h1><?php esc_html_e( 'Freemius Checkout', 'fooplugins-freemius-checkout' ); ?></h1>
		<p><?php esc_html_e( 'Configure shared Freemius checkout defaults and Conversion Bridge custom events for purchases.', 'fooplugins-freemius-checkout' ); ?></p>

		<?php fooplugins_freemius_checkout_render_notice(); ?>
		<?php fooplugins_freemius_checkout_render_admin_tabs( $active_tab, $active_product_slug ); ?>

		<?php if ( 'conversion_bridge' === $active_tab && function_exists( 'fooplugins_freemius_checkout_cb_render_tab' ) ) : ?>
			<?php fooplugins_freemius_checkout_cb_render_tab(); ?>
		<?php elseif ( 'debug' === $active_tab ) : ?>
			<?php fooplugins_freemius_checkout_render_debug_tab(); ?>
		<?php else : ?>
			<?php fooplugins_freemius_checkout_render_checkout_tab(); ?>
		<?php endif; ?>

		<?php fooplugins_freemius_checkout_render_admin_styles(); ?>
	</div>
	<?php
}
