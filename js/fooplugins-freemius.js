(function(CONFIG){

	CONFIG = CONFIG || {};

    function isString(value){
	    return typeof value === "string";
    }

    function hasOwnProperties(target, properties){
	    return properties.every(function(prop){
		    return Object.prototype.hasOwnProperty.call(target, prop);
	    });
    }

    function removeProperties(target, properties){
	    properties.forEach(function(prop){
		    if (Object.prototype.hasOwnProperty.call(target, prop)){
			    delete target[prop];
		    }
	    });
	    return target;
    }

	function normalizeBoolean(value){
		if (!isString(value)) return value;
		const trimmed = value.trim().toLowerCase();
		if (trimmed === "true" || trimmed === "1") return true;
		if (trimmed === "false" || trimmed === "0") return false;
		return value;
	}

	function decodeQueryComponent(value){
		const normalized = value.replace(/\+/g, " ");
		try {
			return decodeURIComponent(normalized);
		} catch (err){
			return normalized;
		}
	}

	function isPlainObject(value){
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}

	function isSafeObjectKey(key){
		const normalized = String(key || "").toLowerCase();
		return normalized !== "__proto__" && normalized !== "prototype" && normalized !== "constructor";
	}

	const CHECKOUT_QUERY_OPTION_TYPES = {
		affiliate_user_id: "integer",
		always_show_renewals_amount: "boolean",
		annual_discount: "boolean",
		billing_cycle_selector: ["list", "responsive_list", "dropdown"],
		bundle_discount: ["true", "false", "maximize"],
		cancel_icon: "https_url",
		cancel_url: "url",
		cart: "boolean",
		currency: ["usd", "eur", "gbp", "auto"],
		default_currency: ["usd", "eur", "gbp"],
		disable_licenses_selector: "boolean",
		form_position: ["left", "right"],
		fullscreen: "boolean",
		gdpr: ["default", "opt_out", "hidden"],
		hide_coupon: "boolean",
		hide_license_key: "boolean",
		hide_licenses: "boolean",
		id: "identifier",
		image: "https_url",
		is_bundle_collapsed: "boolean",
		is_payment_method_update: "boolean",
		language: "locale",
		layout: ["vertical", "horizontal", "null"],
		license_key: "token",
		locale: "locale",
		maximize_discounts: "boolean",
		multisite_discount: ["true", "false", "auto"],
		pricing_id: "integer",
		readonly_user: "boolean",
		refund_policy_position: ["below_form", "below_breakdown", "dynamic"],
		review_id: "integer",
		show_confirmation_dialog: "boolean",
		show_inline_currency_selector: "boolean",
		show_monthly: "boolean",
		show_refund_badge: "boolean",
		show_reviews: "boolean",
		show_upsells: "boolean",
		title: "text",
		user_email: "email",
		user_firstname: "text",
		user_lastname: "text",
		user_token: "token"
	};

	function normalizeCheckoutQueryOptionKey(key){
		if (!key || !isSafeObjectKey(key)) return "";
		const normalized = String(key).trim().toLowerCase();
		if (!isSafeObjectKey(normalized)) return "";
		return Object.prototype.hasOwnProperty.call(CHECKOUT_QUERY_OPTION_TYPES, normalized) ? normalized : "";
	}

	function normalizeBooleanOption(value){
		const normalized = normalizeBoolean(value);
		return typeof normalized === "boolean" ? normalized : undefined;
	}

	function normalizeIntegerOption(value){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		if (!trimmed) return undefined;
		return /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : undefined;
	}

	function normalizeEnumOption(value, allowedValues){
		if (!isString(value)) return undefined;
		const normalized = value.trim().toLowerCase();
		if (allowedValues.indexOf(normalized) === -1) return undefined;
		if (normalized === "true") return true;
		if (normalized === "false") return false;
		return normalized;
	}

	function normalizeIdentifierOption(value){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		return /^[A-Za-z0-9_-]{1,80}$/.test(trimmed) ? trimmed : undefined;
	}

	function normalizeTextOption(value){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		if (!trimmed || /[<>\u0000-\u001F\u007F]/.test(trimmed)) return undefined;
		return trimmed.substring(0, 200);
	}

	function normalizeTokenOption(value){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		if (!trimmed || /[<>\u0000-\u001F\u007F]/.test(trimmed)) return undefined;
		return trimmed.substring(0, 512);
	}

	function normalizeEmailOption(value){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed) ? trimmed : undefined;
	}

	function normalizeLocaleOption(value){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		const normalized = trimmed.toLowerCase();
		if (normalized === "auto" || normalized === "auto-beta") return normalized;
		return /^[A-Za-z]{2,3}(?:[_-][A-Za-z0-9]{2,8})?$/.test(trimmed) ? trimmed : undefined;
	}

	function normalizeUrlOption(value, httpsOnly){
		if (!isString(value)) return undefined;
		const trimmed = value.trim();
		if (!trimmed) return undefined;
		try {
			const base = typeof window !== "undefined" && window.location ? window.location.href : undefined;
			const url = new URL(trimmed, base);
			if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
			if (httpsOnly && url.protocol !== "https:") return undefined;
			return url.toString();
		} catch (err){
			return undefined;
		}
	}

	function normalizeCheckoutQueryOptionValue(key, value){
		const type = CHECKOUT_QUERY_OPTION_TYPES[key];
		if (Array.isArray(type)) return normalizeEnumOption(value, type);
		if (type === "boolean") return normalizeBooleanOption(value);
		if (type === "integer") return normalizeIntegerOption(value);
		if (type === "identifier") return normalizeIdentifierOption(value);
		if (type === "text") return normalizeTextOption(value);
		if (type === "token") return normalizeTokenOption(value);
		if (type === "email") return normalizeEmailOption(value);
		if (type === "locale") return normalizeLocaleOption(value);
		if (type === "url") return normalizeUrlOption(value, false);
		if (type === "https_url") return normalizeUrlOption(value, true);
		return undefined;
	}

	function normalizeTrial(value){
		const normalized = normalizeBoolean(value);
		if (typeof normalized === "boolean") return normalized;
		if (!isString(value)) return undefined;
		const trimmed = value.trim().toLowerCase();
		return trimmed === "free" || trimmed === "paid" ? trimmed : undefined;
	}

	function normalizeCoupon(value){
		if (!isString(value)) return null;
		const trimmed = value.trim();
		return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
	}

	function firstDefined(){
		for (let i = 0; i < arguments.length; i++){
			if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== ""){
				return arguments[i];
			}
		}
	}

	function slugify(value, fallback){
		if (!isString(value)) return fallback;
		const slug = value
			.trim()
			.toLowerCase()
			.replace(/&/g, "and")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
		return slug || fallback;
	}

	function cleanObject(value){
		const cleaned = {};
		Object.keys(value).forEach(function(key){
			if (!isSafeObjectKey(key)) return;
			if (value[key] !== undefined && value[key] !== null && value[key] !== ""){
				cleaned[key] = value[key];
			}
		});
		return cleaned;
	}

    class FooCheckout {
	    /**
	     * A map of product_id to handler.
	     * @private
	     * @type {Map<Number, FS.Checkout>}
	     */
	    static #HANDLERS = new Map();
	    static #CHECKOUT_SCRIPT_LOAD = null;
	    static #ACTIVE_ATTEMPT = null;
	    /**
	     * A map of checkout_id to checkout context.
	     * @private
	     * @type {Map<String, Object>}
	     */
	    static #CHECKOUT_CONTEXTS = new Map();
	    static #PURCHASE_STATES = new WeakMap();
	    static #STORAGE_PREFIX = "fooplugins_freemius_checkout:";
	    static #THANK_YOU_DISPATCHED = false;
	    static #SOURCE_CONTEXT_VERSION = 2;
	    static #SOURCE_TTL_MS = 30 * 60 * 1000;
	    static #SOURCE_COMPARE_PAGE = "/foogallery-wordpress-gallery-plugin/compare-plans/";
	    static #SOURCE_PRICING_PAGES = Object.freeze([
		    "/foogallery-wordpress-gallery-plugin/", "/foobox/",
		    "/foobar-wordpress-notification-bars/", "/fooconvert/",
		    "/foopass-bundle/", "/bundles/"
	    ]);
	    static #SOURCE_ADDON_PAGES = Object.freeze([
		    "/foogallery-wordpress-gallery-plugin/user-uploads/",
		    "/foogallery-wordpress-gallery-plugin/social/",
		    "/foogallery-wordpress-gallery-plugin/whitelabel/",
		    "/foogallery-wordpress-gallery-plugin/client-proofing/"
	    ]);
	    static #SOURCE_COHORTS = Object.freeze([
		    "compare_plans", "plan_advisor", "product_pricing", "addon", "documentation", "trial", "unknown"
	    ]);
	    static #IMMUTABLE_CONTEXT_KEYS = Object.freeze([
		    "attempt_id", "checkout_id", "cta_location",
		    "source_context_version", "source_page", "source_cohort", "source_created_at"
	    ]);
	    /**
	     * The Regular Expressions used to parse the url.
	     * @private
	     * @type {{plugin_plan_licenses: RegExp, billing_cycle: RegExp, trial: RegExp}}
	     */
	    static #REGEX = {
		    plugin_plan_licenses: /\/(?:plugin|bundle)\/(\d+?)(?:\/plan\/(\d+?))?(?:\/licenses\/(\d+?))?(?:\/|[?#]|$)/,
		    billing_cycle: /[?&]billing_cycle=(monthly|annual|lifetime|none)(?:$|&)/,
		    trial: /[?&]trial=(\w+)(?:$|&)/,
			coupon: /[?&]coupon=([^&#]+)(?:$|&|#)/
	    };

		/**
		 * The current options for the plugin.
		 * @type {{selector: string, plugins: [], success_url: ?string, affiliation: ?string, checkout_defaults: Object}}
		 */
	    static options = {
		    selector: "a[href^='https://checkout.freemius.com/']",
		    checkout_script_url: "https://checkout.freemius.com/js/v1/",
		    plugins: [],
		    success_url: null,
		    affiliation: null,
		    checkout_open_timeout_ms: 10000,
		    checkout_defaults: {},
		    default_plan: "default_plan",
		    success_url_params: {
			    checkout_id: "fs_checkout_id",
			    product_slug: "fs_product",
			    plan_slug: "fs_plan",
			    transaction_id: "fs_transaction"
		    }
	    };

	    /**
	     * Registers a callback to be executed once the DOMContentLoaded event is fired.
	     * If the document is no longer loading the callback is executed immediately.
	     * @param {Function} callback
	     */
	    static ready(callback){
		    const self = this;
		    function onready() {
			    try {
				    callback.call(self, self);
			    } catch (err) {
				    console.error(err);
			    }
		    }
		    if (document.readyState !== "loading") onready();
		    else document.addEventListener('DOMContentLoaded', onready, false);
	    }

	    /**
	     * Configure the options for the plugin.
	     * @param options
	     * @returns {{affiliation: string, plugins: [], success_url: string, selector: string}}
	     */
	    static configure(options){
		    Object.assign(this.options, options);
		    return this.options;
	    }

	    static #getCheckoutDefaults(){
		    const defaults = this.options.checkout_defaults;
		    const normalized = {};
		    if (!isPlainObject(defaults)) return normalized;
		    Object.keys(defaults).forEach(function(key){
			    if (!key || !isSafeObjectKey(key)) return;
			    normalized[key] = normalizeBoolean(defaults[key]);
		    });
		    return normalized;
	    }

	    static #getPageCoupon(){
		    if (typeof window === "undefined" || !window.location || !window.location.search) return null;
		    const params = new URLSearchParams(window.location.search);
		    const coupon = params.get("coupon");
		    if (!coupon) return null;
		    return normalizeCoupon(coupon);
	    }

	    static #appendCouponToLink(link, coupon){
		    if (!coupon || !link || !link.href) return;
		    try {
			    const url = new URL(link.href);
			    if (url.searchParams.has("coupon")) return;
			    url.searchParams.append("coupon", coupon);
			    link.href = url.toString();
			    return;
		    } catch (err){
			    if (this.#REGEX.coupon.test(link.href)) return;
		    }
		    const hashIndex = link.href.indexOf("#");
		    const base = hashIndex === -1 ? link.href : link.href.substring(0, hashIndex);
		    const hash = hashIndex === -1 ? "" : link.href.substring(hashIndex);
		    const separator = base.indexOf("?") === -1 ? "?" : "&";
		    link.href = base + separator + "coupon=" + encodeURIComponent(coupon) + hash;
	    }

	    /**
	     * Initialize the plugin finding and binding all checkout links in the page.
	     * @param options
	     */
	    static init(options){
		    const self = this;
		    if (options) self.configure(options);
		    self.#dispatchThankYouEvent();
		    const links = document.querySelectorAll(self.options.selector);
		    const pageCoupon = self.#getPageCoupon();
		    links.forEach(function(link){
			    if (pageCoupon) self.#appendCouponToLink(link, pageCoupon);
			    link.addEventListener("click", function(e){
				    if (!self.#isModalActivation(e)) return;
				    try {
					    if (self.open(link)) e.preventDefault();
				    } catch (err){
					    console.error("Freemius checkout activation failed before interception.", err);
				    }
			    });
		    });
	    }

	    static #isModalActivation(event){
		    if (!event || event.defaultPrevented) return false;
		    if (event.button !== undefined && event.button !== 0) return false;
		    return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
	    }

	    /**
	     * Opens the checkout for the supplied link.
	     * @param {HTMLAnchorElement} link
	     * @returns {boolean}
	     */
	    static open(link){

			// check if the link is an a tag
			if (link && link.tagName !== "A") {
				// link could be a span within the anchor. Make sure to get the anchor href.
				link = link.closest("a");
			}

			//check that the link has an href
			if (!link || !link.href) return false;

		    const href = link.href;
		    let parsed;
		    try {
			    parsed = this.parse(href);
		    } catch (err){
			    console.error("Freemius checkout URL could not be parsed.", err);
			    return false;
		    }
		    if (!parsed) return false;

		    if (this.#ACTIVE_ATTEMPT) return true;

		    const plugin = this.options.plugins.find(function(p){
			    return p.product_id === parsed.product_id;
		    }) || null;
		    const checkoutOptions = Object.assign({}, this.#getCheckoutDefaults(), parsed);
		    const contextPlugin = plugin || {
			    product_id: parsed.product_id,
			    product_slug: "product-" + parsed.product_id,
			    product_name: "Product " + parsed.product_id
		    };
		    const attempt = {
			    href: href,
			    plugin: plugin,
			    checkout_options: checkoutOptions,
			    context: this.#createCheckoutContext(contextPlugin, checkoutOptions, link),
			    started_at: this.#now(),
			    opened_at: null,
			    state: "opening",
			    fallback_started: false,
			    observer: null,
			    poll_timer: null,
			    timeout_timer: null,
			    baseline_frames: new Set()
		    };
		    this.#ACTIVE_ATTEMPT = attempt;
		    this.#CHECKOUT_CONTEXTS.set(attempt.context.checkout_id, attempt.context);
		    this.#dispatchDiagnosticEvent(
			    "fooplugins_checkout_attempt",
			    this.#buildDiagnosticDetail(attempt)
		    );

		    Promise.resolve().then(function(){
			    return FooCheckout.#startAttempt(attempt);
		    }).catch(function(err){
			    FooCheckout.#failAttempt(attempt, "unknown", "unexpected_error", err);
		    });
		    return true;
	    }

	    static async #startAttempt(attempt){
		    if (!this.#isCurrentAttempt(attempt)) return;

		    if (!attempt.plugin){
			    this.#failAttempt(attempt, "handler_create", "product_not_configured");
			    return;
		    }
		    if (!isString(attempt.plugin.public_key) || !attempt.plugin.public_key.trim()){
			    this.#failAttempt(attempt, "handler_create", "public_key_missing");
			    return;
		    }

		    try {
			    if (!this.#isCheckoutApiReady()) await this.#loadCheckoutScript();
		    } catch (err){
			    this.#failAttempt(
				    attempt,
				    err && err.failure_stage ? err.failure_stage : "script_load",
				    err && err.error_code ? err.error_code : "sdk_request_failed",
				    err
			    );
			    return;
		    }

		    if (!this.#isCurrentAttempt(attempt)) return;
		    if (!this.#isCheckoutApiReady()){
			    this.#failAttempt(attempt, "handler_create", "checkout_api_unavailable");
			    return;
		    }

		    let handler;
		    try {
			    handler = this.#getHandler(attempt.plugin);
		    } catch (err){
			    this.#failAttempt(attempt, "handler_create", "handler_creation_exception", err);
			    return;
		    }
		    if (!handler || typeof handler.open !== "function"){
			    this.#failAttempt(attempt, "handler_create", "checkout_api_unavailable");
			    return;
		    }

		    this.#watchForVisibleCheckout(attempt);
		    const openOptions = Object.assign({}, attempt.checkout_options, {
			    track: function(event, data){
				    FooCheckout.#handleCheckoutTrack(attempt.plugin, attempt.context, event, data);
			    },
			    purchaseCompleted: function(response){
				    FooCheckout.#markAttemptSuccessful(attempt);
				    FooCheckout.#handlePurchaseCompleted(attempt.plugin, attempt.context, response);
			    },
			    success: function(response){
				    FooCheckout.#markAttemptSuccessful(attempt);
				    FooCheckout.#handleCheckoutSuccess(attempt.plugin, attempt.context, response);
			    },
			    cancel: function(){
				    FooCheckout.#handleCheckoutCancelled(attempt);
			    }
		    });

		    let openResult;
		    try {
			    openResult = handler.open(openOptions);
		    } catch (err){
			    this.#failAttempt(attempt, "open", "handler_open_exception", err);
			    return;
		    }
		    if (openResult === false){
			    this.#failAttempt(attempt, "open", "handler_open_rejected");
			    return;
		    }
		    if (openResult && typeof openResult.then === "function"){
			    try {
				    await openResult;
			    } catch (err){
				    this.#failAttempt(attempt, "open", "handler_open_rejected", err);
			    }
		    }
	    }

	    static #isCheckoutApiReady(){
		    return typeof window !== "undefined" && window.FS && window.FS.Checkout;
	    }

	    static #loadCheckoutScript(){
		    if (this.#isCheckoutApiReady()){
			    return Promise.resolve(window.FS);
		    }
		    if (this.#CHECKOUT_SCRIPT_LOAD){
			    return this.#CHECKOUT_SCRIPT_LOAD;
		    }

		    this.#CHECKOUT_SCRIPT_LOAD = new Promise(function(resolve, reject){
			    if (typeof document === "undefined"){
				    reject(FooCheckout.#createCheckoutError("script_load", "document_unavailable", "Document is unavailable."));
				    return;
			    }
			    const container = document.head || document.body;
			    if (!container){
				    reject(FooCheckout.#createCheckoutError("script_load", "script_container_unavailable", "Script container is unavailable."));
				    return;
			    }

			    const script = document.createElement("script");
			    script.src = FooCheckout.options.checkout_script_url || "https://checkout.freemius.com/js/v1/";
			    script.async = true;
			    script.onload = function(){
				    if (FooCheckout.#isCheckoutApiReady()){
					    resolve(window.FS);
					    return;
				    }
				    FooCheckout.#CHECKOUT_SCRIPT_LOAD = null;
				    reject(FooCheckout.#createCheckoutError("script_load", "sdk_not_initialized", "Freemius Checkout API did not initialize."));
			    };
			    script.onerror = function(){
				    FooCheckout.#CHECKOUT_SCRIPT_LOAD = null;
				    reject(FooCheckout.#createCheckoutError("script_load", "sdk_request_failed", "Freemius Checkout API request failed."));
			    };
			    container.appendChild(script);
		    });

		    return this.#CHECKOUT_SCRIPT_LOAD;
	    }

	    static #createCheckoutError(stage, code, message){
		    const error = new Error(message);
		    error.failure_stage = stage;
		    error.error_code = code;
		    return error;
	    }

	    /**
	     * Warm the Freemius Checkout API after the initial page load has finished.
	     * The existing loader promise is reused if a checkout click happens while
	     * the API is still loading.
	     */
	    static warmAfterLoad(){
		    const self = this;
		    const warm = function(){
			    if (!document.querySelector(self.options.selector)) return;
			    self.#loadCheckoutScript().catch(function(err){
				    console.warn("Freemius Checkout API could not be warmed.", err);
			    });
		    };
		    const scheduleWarm = function(){
			    window.setTimeout(warm, 0);
		    };

		    if (document.readyState === "complete"){
			    scheduleWarm();
			    return;
		    }

		    window.addEventListener("load", scheduleWarm, { once: true });
	    }

	    static #now(){
		    return typeof performance !== "undefined" && typeof performance.now === "function"
			    ? performance.now()
			    : Date.now();
	    }

	    static #createAttemptId(){
		    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"){
			    return crypto.randomUUID();
		    }
		    return "attempt-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 12);
	    }

	    static #getCtaLocation(link){
		    const allowed = ["product_pricing_card", "product_pricing_sticky", "compare_hero", "compare_table", "compare_plan_section", "trial", "plan_advisor_result", "other"];
		    const value = link && link.dataset ? link.dataset.checkoutLocation : undefined;
		    const location = isString(value) ? value.trim().toLowerCase() : "";
		    return allowed.indexOf(location) !== -1 ? location : "other";
	    }

	    static #isTrialCheckout(value){
		    return value !== undefined && value !== null && value !== false && value !== "false" && value !== "0";
	    }

	    static #isCurrentAttempt(attempt){
		    return this.#ACTIVE_ATTEMPT === attempt && attempt && attempt.state === "opening" && !attempt.fallback_started;
	    }

	    static #getCheckoutFrames(){
		    if (typeof document === "undefined") return [];
		    return Array.from(document.querySelectorAll(
			    'iframe[id^="fs-checkout-page-"], iframe[src*="checkout.freemius.com"][src*="_fs_checkout=1"]'
		    ));
	    }

	    static #isElementVisible(element){
		    if (!element || typeof element.getBoundingClientRect !== "function") return false;
		    const rect = element.getBoundingClientRect();
		    if (!(rect.width > 0 && rect.height > 0)) return false;
		    if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return true;
		    const style = window.getComputedStyle(element);
		    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
	    }

	    static #findVisibleCheckout(attempt){
		    return this.#getCheckoutFrames().find(function(frame){
			    return !attempt.baseline_frames.has(frame) && FooCheckout.#isElementVisible(frame);
		    }) || null;
	    }

	    static #checkoutOpenTimeout(){
		    const configured = Number(this.options.checkout_open_timeout_ms);
		    return Number.isFinite(configured) && configured >= 100 ? configured : 10000;
	    }

	    static #watchForVisibleCheckout(attempt){
		    if (!this.#isCurrentAttempt(attempt)) return;
		    this.#getCheckoutFrames().forEach(function(frame){
			    if (FooCheckout.#isElementVisible(frame)) attempt.baseline_frames.add(frame);
		    });

		    const check = function(){
			    if (!FooCheckout.#isCurrentAttempt(attempt)) return;
			    const frame = FooCheckout.#findVisibleCheckout(attempt);
			    if (frame) FooCheckout.#markAttemptOpened(attempt);
		    };

		    if (typeof MutationObserver === "function" && document.documentElement){
			    attempt.observer = new MutationObserver(check);
			    attempt.observer.observe(document.documentElement, {
				    childList: true,
				    subtree: true,
				    attributes: true,
				    attributeFilter: ["class", "style", "hidden"]
			    });
		    }
		    attempt.poll_timer = window.setInterval(check, 50);
		    attempt.timeout_timer = window.setTimeout(function(){
			    FooCheckout.#failAttempt(attempt, "render_timeout", "dialog_not_visible");
		    }, this.#checkoutOpenTimeout());
		    window.setTimeout(check, 0);
	    }

	    static #cleanupAttempt(attempt){
		    if (!attempt) return;
		    try {
			    if (attempt.observer) attempt.observer.disconnect();
		    } catch (err){}
		    try {
			    if (attempt.poll_timer !== null) window.clearInterval(attempt.poll_timer);
		    } catch (err){}
		    try {
			    if (attempt.timeout_timer !== null) window.clearTimeout(attempt.timeout_timer);
		    } catch (err){}
		    attempt.observer = null;
		    attempt.poll_timer = null;
		    attempt.timeout_timer = null;
	    }

	    static #markAttemptOpened(attempt){
		    if (!this.#isCurrentAttempt(attempt)) return;
		    attempt.state = "opened";
		    attempt.opened_at = this.#now();
		    this.#cleanupAttempt(attempt);
		    const loadMs = Math.max(0, Math.round(attempt.opened_at - attempt.started_at));
		    this.#dispatchDiagnosticEvent(
			    "fooplugins_checkout_opened",
			    this.#buildDiagnosticDetail(attempt, { checkout_load_ms: loadMs })
		    );
		    this.#dispatchTrackingEvent(
			    "freemius_checkout_opened",
			    this.#buildEventDetail(attempt.context, "checkout_opened", { checkout_load_ms: loadMs })
		    );
	    }

	    static #markAttemptSuccessful(attempt){
		    if (this.#ACTIVE_ATTEMPT !== attempt || !attempt || attempt.fallback_started) return;
		    this.#cleanupAttempt(attempt);
		    attempt.state = "success";
		    this.#ACTIVE_ATTEMPT = null;
	    }

	    static #handleCheckoutCancelled(attempt){
		    if (this.#ACTIVE_ATTEMPT !== attempt || !attempt || attempt.fallback_started || attempt.state === "success") return;
		    const cancelledAt = this.#now();
		    this.#cleanupAttempt(attempt);
		    attempt.state = "cancelled";
		    this.#ACTIVE_ATTEMPT = null;
		    this.#dispatchDiagnosticEvent(
			    "fooplugins_checkout_cancelled",
			    this.#buildDiagnosticDetail(attempt, {
				    checkout_open_duration_ms: Math.max(0, Math.round(cancelledAt - (attempt.opened_at || attempt.started_at)))
			    })
		    );
	    }

	    static #failAttempt(attempt, stage, code, error){
		    if (!attempt || attempt.fallback_started || attempt.state === "opened" || attempt.state === "success" || attempt.state === "cancelled") return;
		    attempt.fallback_started = true;
		    attempt.state = "failed";
		    try {
			    this.#cleanupAttempt(attempt);
		    } catch (cleanupError){}
		    if (this.#ACTIVE_ATTEMPT === attempt) this.#ACTIVE_ATTEMPT = null;
		    try {
			    if (error) console.error("Freemius checkout failed; using hosted checkout fallback.", error);
		    } catch (loggingError){}
		    try {
			    this.#dispatchDiagnosticEvent(
				    "fooplugins_checkout_open_failed",
				    this.#buildDiagnosticDetail(attempt, {
					    failure_stage: stage || "unknown",
					    error_code: code || "unexpected_error",
					    checkout_load_ms: Math.max(0, Math.round(this.#now() - attempt.started_at))
				    })
			    );
		    } catch (diagnosticError){}

		    try {
			    window.location.assign(attempt.href);
		    } catch (navigationError){
			    window.location.href = attempt.href;
		    }
	    }

	    static #buildDiagnosticDetail(attempt, extra){
		    const context = attempt && attempt.context ? attempt.context : {};
		    return cleanObject(Object.assign({
			    attempt_id: context.attempt_id,
			    checkout_id: context.checkout_id,
			    source_context_version: context.source_context_version,
			    source_page: context.source_page,
			    source_cohort: context.source_cohort,
			    source_created_at: context.source_created_at,
			    product_id: Number(context.product_id) || 0,
			    plan_id: Number(context.plan_id) || 0,
			    licenses: Number(context.licenses) || 1,
			    billing_cycle: context.billing_cycle || "none",
			    is_trial: context.is_trial === true,
			    cta_location: context.cta_location || "other",
			    checkout_mode: "modal"
		    }, extra || {}));
	    }

	    static #dispatchDiagnosticEvent(name, detail){
		    try {
			    if (typeof document === "undefined" || typeof CustomEvent !== "function") return false;
			    document.dispatchEvent(new CustomEvent(name, {
				    bubbles: true,
				    detail: cleanObject(detail || {})
			    }));
			    return true;
		    } catch (err){
			    try {
				    console.warn("Checkout diagnostic event could not be dispatched.", err);
			    } catch (loggingError){}
			    return false;
		    }
	    }

	    /**
	     * Parses the supplied href into the options required to open a Freemius checkout.
	     * @param {string} href
	     * @returns {{product_id: number, licenses: number, billing_cycle: string, plan_id: number, trial: string, coupon: string}}
	     */
	    static parse(href){
		    let checkoutUrl;
		    try {
			    checkoutUrl = new URL(href, typeof window !== "undefined" ? window.location.href : undefined);
		    } catch (err){
			    return;
		    }
		    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.freemius.com") return;
		    href = checkoutUrl.toString();
		    const result = href.match(this.#REGEX.plugin_plan_licenses);
		    if (result !== null){
			    const billing_cycle_match = href.match(this.#REGEX.billing_cycle);
			    let billing_cycle = undefined;
			    if (billing_cycle_match !== null){
				    billing_cycle = billing_cycle_match[1];
			    }
			    const coupon_match = href.match(this.#REGEX.coupon);
			    let coupon = undefined;
			    if (coupon_match !== null){
				    coupon = normalizeCoupon(decodeQueryComponent(coupon_match[1])) || undefined;
			    }
			    const trial_match = href.match(this.#REGEX.trial);
			    let trial = undefined;
			    if (trial_match !== null){
				    trial = normalizeTrial(decodeQueryComponent(trial_match[1]));
			    }
			    const other_query_params = Object.create(null);
			    const query_index = href.indexOf("?");
			    if (query_index !== -1){
				    const hash_index = href.indexOf("#", query_index);
				    const query_string = href.substring(query_index + 1, hash_index === -1 ? undefined : hash_index);
				    if (query_string){
					    const known_keys = ["product_id", "plan_id", "licenses", "billing_cycle", "trial", "coupon"];
					    query_string.split("&").forEach(function(pair){
						    if (!pair) return;
						    const equals_index = pair.indexOf("=");
						    const raw_key = equals_index === -1 ? pair : pair.substring(0, equals_index);
						    const raw_value = equals_index === -1 ? "" : pair.substring(equals_index + 1);
						    const key = normalizeCheckoutQueryOptionKey(decodeQueryComponent(raw_key));
						    if (!key || known_keys.indexOf(key) !== -1) return;
						    const value = normalizeCheckoutQueryOptionValue(key, decodeQueryComponent(raw_value));
						    if (value === undefined) return;
						    other_query_params[key] = value;
					    });
				    }
			    }
			    const parsed = cleanObject({
				    ...other_query_params,
				    product_id: parseInt(result[1]),
				    licenses: result[3] ? parseInt(result[3]) : 1, // Default to 1 license if not specified
				    billing_cycle: billing_cycle,
				    trial,
				    coupon
			    });
			    if (result[2]){
				    parsed.plan_id = parseInt(result[2]);
			    }
			    return parsed;
		    }
	    }

	    /**
	     * Gets the Freemius checkout handler for the supplied plugin or creates it if one does not exist.
	     * @param {{product_id: number, public_key: string, product_name: string, success_url: ?string}} plugin
	     * @returns {FS.Checkout}
	     */
	    static #getHandler(plugin){
		    const self = this;
		    if (!self.#isCheckoutApiReady()) return null;
		    if (self.#HANDLERS.has(plugin.product_id)){
			    return self.#HANDLERS.get(plugin.product_id);
		    }
		    const config = Object.assign({}, plugin);

            removeProperties(config, ["product_name","product_slug","slug","success_url","plans","plan_slugs","default_plan"]);
		    const handler = new window.FS.Checkout(config);
		    self.#HANDLERS.set(plugin.product_id, handler);
		    return handler;
	    }

	    static #getProductSlug(plugin){
		    return firstDefined(plugin.product_slug, plugin.slug, slugify(plugin.product_name, "product-" + plugin.product_id));
	    }

	    static #getPlanSlug(plugin, planId){
		    const fallback = firstDefined(plugin.default_plan, this.options.default_plan, "default_plan");
		    if (planId === undefined || planId === null || planId === "") return fallback;
		    const planKey = String(planId);
		    const plans = plugin.plans || plugin.plan_slugs;
		    if (isPlainObject(plans)){
			    if (Object.prototype.hasOwnProperty.call(plans, planKey)) return plans[planKey];
			    if (Object.prototype.hasOwnProperty.call(plans, planId)) return plans[planId];
		    }
		    if (Array.isArray(plans)){
			    const match = plans.find(function(plan){
				    if (!isPlainObject(plan)) return false;
				    const id = firstDefined(plan.plan_id, plan.id);
				    return String(id) === planKey;
			    });
			    if (match){
				    return firstDefined(match.plan_slug, match.slug, match.name, fallback);
			    }
		    }
		    return fallback;
	    }

	    static #createCheckoutId(productSlug, planSlug){
		    return [productSlug, planSlug, Date.now().toString(36), Math.random().toString(36).substring(2, 10)]
			    .filter(Boolean)
			    .join("-");
	    }

	    // Closed pathname projection: never retain a URL, query, fragment, or documentation suffix.
	    static #normalizeSourcePage(path){
		    if (!isString(path)) return "unknown";
		    if (path === this.#SOURCE_COMPARE_PAGE || this.#SOURCE_PRICING_PAGES.includes(path) || this.#SOURCE_ADDON_PAGES.includes(path)) return path;
		    if (path.indexOf("/documentation/") === 0) return "/documentation/";
		    return "unknown";
	    }

	    static #getSourceCohort(page, cta){
		    if (cta === "trial") return "trial";
		    if (cta === "plan_advisor_result") return "plan_advisor";
		    if (page === this.#SOURCE_COMPARE_PAGE) return "compare_plans";
		    if (this.#SOURCE_ADDON_PAGES.includes(page)) return "addon";
		    if (page === "/documentation/") return "documentation";
		    if (this.#SOURCE_PRICING_PAGES.includes(page)) return "product_pricing";
		    return "unknown";
	    }

	    static #captureSourceContext(cta){
		    let page = "unknown";
		    try {
			    page = this.#normalizeSourcePage(new URL(window.location.href).pathname);
		    } catch (err){}
		    return {
			    source_context_version: this.#SOURCE_CONTEXT_VERSION,
			    source_page: page,
			    source_cohort: this.#getSourceCohort(page, cta),
			    source_created_at: Date.now()
		    };
	    }

	    static #isValidStoredSourceContext(stored){
		    const timestamp = stored.source_created_at;
		    const now = Date.now();
		    return stored.source_context_version === this.#SOURCE_CONTEXT_VERSION &&
			    isString(stored.source_page) &&
			    this.#normalizeSourcePage(stored.source_page) === stored.source_page &&
			    this.#SOURCE_COHORTS.includes(stored.source_cohort) &&
			    this.#getSourceCohort(stored.source_page, stored.cta_location) === stored.source_cohort &&
			    Number.isSafeInteger(timestamp) && timestamp >= 0 &&
			    timestamp <= now && now - timestamp <= this.#SOURCE_TTL_MS;
	    }

	    static #lockCheckoutIdentity(context){
		    this.#IMMUTABLE_CONTEXT_KEYS.forEach(function(key){
			    Object.defineProperty(context, key, { value: context[key], enumerable: true, writable: false, configurable: false });
		    });
		    return context;
	    }

	    static #createCheckoutContext(plugin, parsed, link){
		    const productSlug = this.#getProductSlug(plugin);
		    const planSlug = this.#getPlanSlug(plugin, parsed.plan_id);
		    const cta = this.#getCtaLocation(link);
		    // Capture exactly once on accepted initiation; callbacks only enrich mutable commerce fields.
		    return this.#lockCheckoutIdentity(cleanObject(Object.assign({
			    attempt_id: this.#createAttemptId(),
			    checkout_id: this.#createCheckoutId(productSlug, planSlug),
			    category: "freemius_checkout",
			    product_id: Number(parsed.product_id) || 0,
			    plan_id: Number(parsed.plan_id) || 0,
			    product_slug: productSlug,
			    plan_slug: planSlug,
			    product_name: plugin.product_name,
			    billing_cycle: parsed.billing_cycle,
			    licenses: parsed.licenses,
			    coupon: this.#normalizeCoupon(parsed.coupon),
			    trial: this.#normalizeTrial(parsed.trial),
			    is_trial: this.#isTrialCheckout(this.#normalizeTrial(parsed.trial)),
			    cta_location: cta,
			    checkout_mode: "modal",
			    affiliation: this.options.affiliation
		    }, this.#captureSourceContext(cta))));
	    }

	    static #normalizeEventName(event){
		    if (!isString(event)) return "unknown";
		    return event
			    .trim()
			    .toLowerCase()
			    .replace(/[^a-z0-9]+/g, "_")
			    .replace(/^_+|_+$/g, "") || "unknown";
	    }

	    static #buildEventDetail(context, stage, extra){
		    return cleanObject(Object.assign({}, context, extra || {}, {
			    checkout_stage: stage
		    }));
	    }

	    static #dispatchTrackingEvent(name, detail){
		    try {
			    if (typeof document === "undefined" || typeof CustomEvent !== "function") return false;
			    const eventDetail = cleanObject(detail || {});
			    document.dispatchEvent(new CustomEvent(name, {
				    bubbles: true,
				    detail: eventDetail
			    }));
			    if (eventDetail.product_slug){
				    document.dispatchEvent(new CustomEvent(eventDetail.product_slug + "_" + name, {
					    bubbles: true,
					    detail: eventDetail
				    }));
			    }
			    return true;
		    } catch (err){
			    try {
				    console.warn("Checkout tracking event could not be dispatched.", err);
			    } catch (loggingError){}
			    return false;
		    }
	    }

	    static #getTrackedDataValue(data, path){
		    if (!isPlainObject(data)) return undefined;
		    let current = data;
		    for (let i = 0; i < path.length; i++){
			    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
			    current = current[path[i]];
			    if (current === undefined || current === null || current === "") return undefined;
		    }
		    return current;
	    }

	    static #applyCheckoutTrackData(plugin, context, data){
		    const planId = firstDefined(
			    this.#getTrackedDataValue(data, ["plan", "id"]),
			    this.#getTrackedDataValue(data, ["plan_id"]),
			    this.#getTrackedDataValue(data, ["purchase", "plan_id"])
		    );
		    if (planId !== undefined) context.plan_slug = this.#getPlanSlug(plugin, planId);

		    const billingCycle = firstDefined(
			    this.#getTrackedDataValue(data, ["billing_cycle"]),
			    this.#getTrackedDataValue(data, ["billingCycle"]),
			    this.#getTrackedDataValue(data, ["purchase", "billing_cycle"])
		    );
		    const normalizedBillingCycle = this.#normalizeBillingCycle(billingCycle);
		    if (normalizedBillingCycle) context.billing_cycle = normalizedBillingCycle;

		    const licenses = firstDefined(
			    this.#getTrackedDataValue(data, ["licenses"]),
			    this.#getTrackedDataValue(data, ["purchase", "licenses"])
		    );
		    const normalizedLicenses = this.#normalizePurchaseQuantity(licenses);
		    if (normalizedLicenses) context.licenses = normalizedLicenses;

		    const coupon = firstDefined(
			    this.#getTrackedDataValue(data, ["coupon"]),
			    this.#getTrackedDataValue(data, ["coupon_id"]),
			    this.#getTrackedDataValue(data, ["purchase", "coupon_id"])
		    );
		    const normalizedCoupon = this.#normalizeCoupon(coupon);
		    if (normalizedCoupon !== undefined) context.coupon = normalizedCoupon;
		    else delete context.coupon;

		    const currency = firstDefined(
			    this.#getTrackedDataValue(data, ["currency"]),
			    this.#getTrackedDataValue(data, ["purchase", "currency"])
		    );
		    const normalizedCurrency = this.#normalizePurchaseCurrency(currency);
		    if (normalizedCurrency) context.currency = normalizedCurrency;

		    return context;
	    }

	    static #handleCheckoutTrack(plugin, context, event, data){
		    const normalizedEvent = this.#normalizeEventName(event);
		    this.#applyCheckoutTrackData(plugin, context, data);
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    this.#dispatchTrackingEvent(
			    "freemius_checkout_" + normalizedEvent,
			    this.#buildEventDetail(context, normalizedEvent, {
				    freemius_event: normalizedEvent
			    })
		    );
	    }

	    static #getPurchaseValue(purchase, checkoutIsTrial){
		    if (!isPlainObject(purchase)) return undefined;
		    const hasTrialEnds = Object.prototype.hasOwnProperty.call(purchase, "trial_ends");
		    const trialEnds = purchase.trial_ends;
		    const parsedTrialEnds = isString(trialEnds) ? Date.parse(trialEnds) : NaN;
		    const canonicalTrialEnds = Number.isFinite(parsedTrialEnds) ? new Date(parsedTrialEnds).toISOString() : "";
		    const hasActualTrialMarker = isString(trialEnds) &&
			    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(trialEnds) &&
			    (trialEnds === canonicalTrialEnds || trialEnds === canonicalTrialEnds.replace(".000Z", "Z"));
		    if (hasTrialEnds && trialEnds !== false && trialEnds !== null && !hasActualTrialMarker) return undefined;
		    if (Boolean(checkoutIsTrial) !== hasActualTrialMarker) return undefined;
		    if (hasActualTrialMarker) return 0;
		    if (purchase.initial_amount !== undefined && purchase.initial_amount !== null) return purchase.initial_amount;
		    return purchase.gross;
	    }

	    static #normalizeMoney(value){
		    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
		    const scaled = value * 100;
		    const cents = Math.round(scaled);
		    if (!Number.isSafeInteger(cents) || Math.abs(scaled - cents) > 1e-7) return null;
		    return {
			    cents: cents,
			    value: cents / 100
		    };
	    }

	    static #normalizePurchaseQuantity(value){
		    return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
	    }

	    static #normalizePurchaseCurrency(value){
		    if (!isString(value)) return null;
		    const normalized = value.trim().toUpperCase();
		    return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
	    }

	    static #normalizeCoupon(value){
		    if (value === undefined || value === null || value === "") return undefined;
		    if (!isString(value) || value.trim() !== value) return undefined;
		    return /^(?!\d{7,}$)[A-Za-z0-9_-]{1,64}$/.test(value) ? value : undefined;
	    }

	    static #normalizeBillingCycle(value){
		    return ["monthly", "annual", "lifetime", "none"].indexOf(value) !== -1 ? value : null;
	    }

	    static #normalizeTrial(value){
		    return normalizeTrial(value);
	    }

	    static #normalizeTransactionId(value){
		    if (typeof value === "number"){
			    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
		    }
		    if (!isString(value)) return null;
		    return /^(?:[1-9]\d{0,19})$/.test(value) ? value : null;
	    }

	    static #getPurchaseState(context){
		    let state = this.#PURCHASE_STATES.get(context);
		    if (!state){
			    state = {
				    detail: null,
				    confirmation_dispatched: false,
				    success_dispatched: false
			    };
			    this.#PURCHASE_STATES.set(context, state);
		    }
		    return state;
	    }

	    static #buildPurchaseContext(plugin, context, response){
		    if (!isPlainObject(response) || !isPlainObject(response.purchase)) return null;
		    const purchase = response.purchase;
		    const transactionId = this.#normalizeTransactionId(purchase.id);
		    const money = this.#normalizeMoney(this.#getPurchaseValue(purchase, context.is_trial));
		    const currency = this.#normalizePurchaseCurrency(
			    purchase.currency !== undefined ? purchase.currency : context.currency
		    );
		    const quantity = this.#normalizePurchaseQuantity(
			    purchase.licenses !== undefined ? purchase.licenses : context.licenses
		    );
		    if (!transactionId || !money || !currency || !quantity) return null;

		    const purchasePlanId = firstDefined(purchase.plan_id, purchase.plan && purchase.plan.id);
		    const planSlug = purchasePlanId !== undefined ? this.#getPlanSlug(plugin, purchasePlanId) : context.plan_slug;
		    const unitPrice = money.cents === 0 ? 0 : money.cents / (100 * quantity);
		    const item = cleanObject({
			    item_id: context.product_slug,
			    item_name: context.product_name,
			    item_variant: planSlug,
			    item_category: "Plugin",
			    price: unitPrice,
			    quantity: quantity,
			    currency: currency
		    });
		    return cleanObject(Object.assign({}, context, {
			    checkout_stage: "purchase_confirmed",
			    transaction_id: transactionId,
			    value: money.value,
			    currency: currency,
			    plan_slug: planSlug,
			    coupon: this.#normalizeCoupon(firstDefined(purchase.coupon_id, context.coupon)),
			    licenses: quantity,
			    item_id: context.product_slug,
			    item_name: context.product_name,
			    item_variant: planSlug,
			    item_category: "Plugin",
			    quantity: quantity,
			    price: unitPrice,
			    items: [item]
		    }));
	    }

	    static #resolvePurchaseContext(plugin, context, response){
		    const state = this.#getPurchaseState(context);
		    const candidate = this.#buildPurchaseContext(plugin, context, response);
		    if (candidate && !state.detail){
			    state.detail = candidate;
			    Object.keys(candidate).forEach(function(key){
				    if (!FooCheckout.#IMMUTABLE_CONTEXT_KEYS.includes(key)) context[key] = candidate[key];
			    });
		    }
		    return state.detail;
	    }

	    static #storePurchaseContext(detail){
		    if (!detail || !detail.checkout_id) return;
		    try {
			    if (typeof sessionStorage === "undefined") return;
			    sessionStorage.setItem(this.#STORAGE_PREFIX + detail.checkout_id, JSON.stringify(detail));
			    sessionStorage.setItem(this.#STORAGE_PREFIX + "latest", JSON.stringify(detail));
		    } catch (err){
			    // Storage can be disabled by browser privacy settings.
		    }
	    }

	    static #handlePurchaseCompleted(plugin, context, response){
		    const state = this.#getPurchaseState(context);
		    const detail = this.#resolvePurchaseContext(plugin, context, response);
		    if (!detail || state.confirmation_dispatched) return;
		    state.confirmation_dispatched = true;
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    this.#storePurchaseContext(detail);
		    this.#dispatchTrackingEvent("freemius_purchase_confirmed", detail);
	    }

	    static #handleCheckoutSuccess(plugin, context, response){
		    const state = this.#getPurchaseState(context);
		    const detail = this.#resolvePurchaseContext(plugin, context, response);
		    if (state.success_dispatched) return;
		    state.success_dispatched = true;
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    if (detail) this.#storePurchaseContext(detail);
		    const lifecycleDetail = detail || context;
		    this.#dispatchTrackingEvent("freemius_checkout_success", this.#buildEventDetail(lifecycleDetail, "checkout_success"));

		    const successUrl = this.#getSuccessUrl(plugin, lifecycleDetail);
		    if (isString(successUrl)){
			    location.href = successUrl;
		    }
	    }

	    static #getSuccessUrl(plugin, detail){
		    const successUrl = plugin.success_url || this.options.success_url;
		    if (!isString(successUrl)) return successUrl;
		    const params = isPlainObject(this.options.success_url_params) ? this.options.success_url_params : {};
		    try {
			    const url = new URL(successUrl, window.location.href);
			    [
				    ["checkout_id", params.checkout_id || "fs_checkout_id"],
				    ["product_slug", params.product_slug || "fs_product"],
				    ["plan_slug", params.plan_slug || "fs_plan"],
				    ["transaction_id", params.transaction_id || "fs_transaction"]
			    ].forEach(function(pair){
				    const value = detail[pair[0]];
				    if (value !== undefined && value !== null && value !== ""){
					    url.searchParams.set(pair[1], value);
				    }
			    });
			    return url.toString();
		    } catch (err){
			    return successUrl;
		    }
	    }

	    static #getPluginByProductSlug(productSlug){
		    if (!productSlug) return null;
		    return this.options.plugins.find(function(plugin){
			    return FooCheckout.#getProductSlug(plugin) === productSlug;
		    }) || null;
	    }

	    static #sameUrlPath(firstUrl, secondUrl){
		    try {
			    const first = new URL(firstUrl, window.location.href);
			    const second = new URL(secondUrl, window.location.href);
			    const normalize = function(path){
				    const normalized = path.replace(/\/+$/, "");
				    return normalized || "/";
			    };
			    return normalize(first.pathname) === normalize(second.pathname);
		    } catch (err){
			    return false;
		    }
	    }

	    static #isCurrentSuccessUrl(productSlug){
		    const plugin = this.#getPluginByProductSlug(productSlug);
		    if (!plugin) return false;
		    const successUrl = plugin.success_url || this.options.success_url;
		    return isString(successUrl) && this.#sameUrlPath(window.location.href, successUrl);
	    }

	    static #getStoredPurchaseContext(checkoutId){
		    if (!checkoutId) return null;
		    try {
			    if (typeof sessionStorage === "undefined") return null;
			    const storedValue = sessionStorage.getItem(this.#STORAGE_PREFIX + checkoutId);
			    if (!storedValue) return null;
			    const stored = JSON.parse(storedValue);
			    return isPlainObject(stored) ? stored : null;
		    } catch (err){
			    return null;
		    }
	    }

	    static #hasOnlyOwnKeys(value, allowedKeys){
		    return isPlainObject(value) && Object.keys(value).every(function(key){
			    return allowedKeys.indexOf(key) !== -1;
		    });
	    }

	    static #isConfiguredPlanSlug(plugin, planSlug){
		    if (!isString(planSlug) || !planSlug) return false;
		    if (planSlug === this.#getPlanSlug(plugin)) return true;
		    const plans = plugin.plans || plugin.plan_slugs;
		    if (isPlainObject(plans)){
			    return Object.keys(plans).some(function(planId){
				    return FooCheckout.#getPlanSlug(plugin, planId) === planSlug;
			    });
		    }
		    if (Array.isArray(plans)){
			    return plans.some(function(plan){
				    if (!isPlainObject(plan)) return false;
				    const planId = firstDefined(plan.plan_id, plan.id);
				    return FooCheckout.#getPlanSlug(plugin, planId) === planSlug;
			    });
		    }
		    return false;
	    }

	    // Match only identities this producer creates, not generic free-text tokens.
	    static #isGeneratedAttemptId(value){
		    return isString(value) && (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value) || /^attempt-[a-z0-9]{8,11}-[a-z0-9]{1,10}$/.test(value));
	    }

	    static #isGeneratedCheckoutId(plugin, value){
		    if (!isString(value)) return false;
		    const prefix = this.#getProductSlug(plugin) + "-";
		    if (!value.startsWith(prefix)) return false;
		    const tail = value.substring(prefix.length).match(/^(.+)-[a-z0-9]{8,11}-[a-z0-9]{1,8}$/);
		    return !!tail && this.#isConfiguredPlanSlug(plugin, tail[1]);
	    }

	    static #revalidateStoredPurchaseContext(plugin, stored){
		    const allowedKeys = [
			    "attempt_id", "checkout_id", "category", "product_id", "plan_id", "product_slug",
			    "plan_slug", "product_name", "billing_cycle", "licenses", "coupon", "trial", "is_trial",
			    "cta_location", "checkout_mode", "affiliation", "checkout_stage", "transaction_id", "value",
			    "currency", "item_id", "item_name", "item_variant", "item_category", "quantity", "price", "items",
			    "source_context_version", "source_page", "source_cohort", "source_created_at"
		    ];
		    const allowedItemKeys = ["item_id", "item_name", "item_variant", "item_category", "price", "quantity", "currency"];
		    if (!this.#hasOnlyOwnKeys(stored, allowedKeys) || !this.#isValidStoredSourceContext(stored) || !Array.isArray(stored.items) || stored.items.length !== 1) return null;
		    const item = stored.items[0];
		    if (!this.#hasOnlyOwnKeys(item, allowedItemKeys)) return null;

		    const productSlug = this.#getProductSlug(plugin);
		    const productName = plugin.product_name;
		    const transactionId = this.#normalizeTransactionId(stored.transaction_id);
		    const money = this.#normalizeMoney(stored.value);
		    const currency = this.#normalizePurchaseCurrency(stored.currency);
		    const quantity = this.#normalizePurchaseQuantity(stored.quantity);
		    if (
			    !transactionId || transactionId !== stored.transaction_id || !money || money.value !== stored.value ||
			    !currency || currency !== stored.currency || !quantity || stored.licenses !== quantity ||
			    stored.category !== "freemius_checkout" || stored.checkout_stage !== "purchase_confirmed" ||
			    stored.product_id !== Number(plugin.product_id) || stored.product_slug !== productSlug ||
			    stored.product_name !== productName || !this.#isConfiguredPlanSlug(plugin, stored.plan_slug) ||
			    (stored.plan_id !== undefined && stored.plan_id !== 0 && (!Number.isSafeInteger(stored.plan_id) || stored.plan_id < 0 || this.#getPlanSlug(plugin, stored.plan_id) !== stored.plan_slug)) ||
			    (stored.plan_id === 0 && this.#getPlanSlug(plugin) !== stored.plan_slug) ||
			    (stored.billing_cycle !== undefined && this.#normalizeBillingCycle(stored.billing_cycle) !== stored.billing_cycle) ||
			    (stored.coupon !== undefined && this.#normalizeCoupon(stored.coupon) !== stored.coupon) ||
			    !["product_pricing_card", "product_pricing_sticky", "compare_hero", "compare_table", "compare_plan_section", "trial", "plan_advisor_result", "other"].includes(stored.cta_location) ||
			    stored.item_id !== productSlug || stored.item_name !== productName ||
			    stored.item_variant !== stored.plan_slug || stored.item_category !== "Plugin" ||
			    stored.checkout_mode !== "modal" || typeof stored.is_trial !== "boolean" ||
			    stored.trial !== this.#normalizeTrial(stored.trial) ||
			    stored.is_trial !== this.#isTrialCheckout(stored.trial)
		    ) return null;

		    const unitPrice = money.cents === 0 ? 0 : money.cents / (100 * quantity);
		    if (
			    stored.price !== unitPrice || item.item_id !== productSlug || item.item_name !== productName ||
			    item.item_variant !== stored.plan_slug || item.item_category !== "Plugin" ||
			    item.price !== unitPrice || item.quantity !== quantity || item.currency !== currency
		    ) return null;
		    if (!this.#isGeneratedAttemptId(stored.attempt_id) || !this.#isGeneratedCheckoutId(plugin, stored.checkout_id)) return null;
		    if (stored.affiliation !== undefined && stored.affiliation !== this.options.affiliation) return null;

		    return cleanObject({
			    attempt_id: stored.attempt_id,
			    checkout_id: stored.checkout_id,
			    source_context_version: stored.source_context_version,
			    source_page: stored.source_page,
			    source_cohort: stored.source_cohort,
			    source_created_at: stored.source_created_at,
			    category: "freemius_checkout",
			    product_id: Number(plugin.product_id),
			    plan_id: stored.plan_id,
			    product_slug: productSlug,
			    plan_slug: stored.plan_slug,
			    product_name: productName,
			    billing_cycle: stored.billing_cycle,
			    licenses: quantity,
			    coupon: this.#normalizeCoupon(stored.coupon),
			    trial: stored.trial,
			    is_trial: stored.is_trial,
			    cta_location: stored.cta_location,
			    checkout_mode: "modal",
			    affiliation: this.options.affiliation,
			    checkout_stage: "purchase_confirmed",
			    transaction_id: transactionId,
			    value: money.value,
			    currency: currency,
			    item_id: productSlug,
			    item_name: productName,
			    item_variant: stored.plan_slug,
			    item_category: "Plugin",
			    quantity: quantity,
			    price: unitPrice,
			    items: [{
				    item_id: productSlug,
				    item_name: productName,
				    item_variant: stored.plan_slug,
				    item_category: "Plugin",
				    price: unitPrice,
				    quantity: quantity,
				    currency: currency
			    }]
		    });
	    }

	    static #getThankYouDetailFromUrl(){
		    if (typeof window === "undefined" || !window.location || !window.location.search) return null;
		    const params = isPlainObject(this.options.success_url_params) ? this.options.success_url_params : {};
		    const urlParams = new URLSearchParams(window.location.search);
		    const checkoutId = urlParams.get(params.checkout_id || "fs_checkout_id");
		    const productSlug = urlParams.get(params.product_slug || "fs_product");
		    const plugin = this.#getPluginByProductSlug(productSlug);
		    if (!checkoutId || !plugin || !this.#isCurrentSuccessUrl(productSlug)) return null;

		    const stored = this.#getStoredPurchaseContext(checkoutId);
		    const validated = this.#revalidateStoredPurchaseContext(plugin, stored);
		    if (!validated || validated.checkout_id !== checkoutId || validated.product_slug !== productSlug) return null;

		    const planSlug = urlParams.get(params.plan_slug || "fs_plan");
		    if (planSlug && planSlug !== validated.plan_slug) return null;

		    const transactionId = urlParams.get(params.transaction_id || "fs_transaction");
		    if (transactionId && transactionId !== validated.transaction_id) return null;

		    return cleanObject(Object.assign({}, validated, {
			    plan_slug: planSlug || validated.plan_slug,
			    transaction_id: transactionId || validated.transaction_id,
			    checkout_stage: "thank_you_viewed",
			    freemius_event: "thank_you_viewed"
		    }));
	    }

	    static #dispatchThankYouEvent(){
		    if (this.#THANK_YOU_DISPATCHED) return;
		    const detail = this.#getThankYouDetailFromUrl();
		    if (!detail) return;
		    this.#THANK_YOU_DISPATCHED = true;
		    try {
			    if (typeof sessionStorage === "undefined" || !detail.checkout_id) return;
			    const sentKey = this.#STORAGE_PREFIX + "thank_you:" + detail.checkout_id;
			    if (sessionStorage.getItem(sentKey)) return;
			    sessionStorage.setItem(sentKey, "1");
		    } catch (err){
			    // Reconstruction is fail-closed if the same-session dedup marker cannot be persisted.
			    return;
		    }
		    this.#dispatchTrackingEvent("freemius_purchase_thank_you_viewed", detail);
	    }
    }

    window.FooCheckout = FooCheckout;

    FooCheckout.ready(function(self){
	    self.configure(CONFIG);
	    self.init();
	    self.warmAfterLoad();
    });

})(window.FOOCHECKOUT);
