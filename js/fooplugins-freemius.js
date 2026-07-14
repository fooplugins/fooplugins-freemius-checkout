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
	    /**
	     * A map of checkout_id to checkout context.
	     * @private
	     * @type {Map<String, Object>}
	     */
	    static #CHECKOUT_CONTEXTS = new Map();
	    static #STORAGE_PREFIX = "fooplugins_freemius_checkout:";
	    static #THANK_YOU_DISPATCHED = false;
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
				    if (self.open(link)){
					    e.preventDefault();
				    }
			    });
		    });
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

		    const parsed = this.parse(link.href);
		    if (parsed){
			    const plugin = this.options.plugins.find(function(p){
				    return p.product_id === parsed.product_id;
			    });
			    if (plugin){
				    const checkoutOptions = Object.assign({}, this.#getCheckoutDefaults(), parsed);
				    const href = link.href;
				    if (this.#isCheckoutApiReady()){
					    return this.#openParsedCheckout(plugin, checkoutOptions);
				    }
				    this.#loadCheckoutScript()
					    .then(function(){
						    if (!FooCheckout.#openParsedCheckout(plugin, checkoutOptions)){
							    window.location.href = href;
						    }
					    })
					    .catch(function(err){
						    console.error("Freemius Checkout API could not be loaded.", err);
						    window.location.href = href;
					    });
				    return true;
			    }
		    }
		    return false;
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
				    reject(new Error("Document is unavailable."));
				    return;
			    }
			    const container = document.head || document.body;
			    if (!container){
				    reject(new Error("Script container is unavailable."));
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
				    reject(new Error("Freemius Checkout API did not initialize."));
			    };
			    script.onerror = function(){
				    FooCheckout.#CHECKOUT_SCRIPT_LOAD = null;
				    reject(new Error("Freemius Checkout API request failed."));
			    };
			    container.appendChild(script);
		    });

		    return this.#CHECKOUT_SCRIPT_LOAD;
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

	    static #openParsedCheckout(plugin, checkoutOptions){
		    const handler = this.#getHandler(plugin);
		    if (!handler) return false;
		    const context = this.#createCheckoutContext(plugin, checkoutOptions);
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    const openOptions = Object.assign({}, checkoutOptions, {
			    track: function(event, data){
				    FooCheckout.#handleCheckoutTrack(plugin, context, event, data);
			    },
			    purchaseCompleted: function(response){
				    FooCheckout.#handlePurchaseCompleted(plugin, context, response);
			    },
			    success: function(response){
				    FooCheckout.#handleCheckoutSuccess(plugin, context, response);
			    }
		    });
		    handler.open(openOptions);
		    this.#dispatchTrackingEvent("freemius_checkout_opened", this.#buildEventDetail(context, "checkout_opened"));
		    return true;
	    }

	    /**
	     * Parses the supplied href into the options required to open a Freemius checkout.
	     * @param {string} href
	     * @returns {{product_id: number, licenses: number, billing_cycle: string, plan_id: number, trial: string, coupon: string}}
	     */
	    static parse(href){
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

	    static #createCheckoutContext(plugin, parsed){
		    const productSlug = this.#getProductSlug(plugin);
		    const planSlug = this.#getPlanSlug(plugin, parsed.plan_id);
		    return cleanObject({
			    checkout_id: this.#createCheckoutId(productSlug, planSlug),
			    category: "freemius_checkout",
			    product_slug: productSlug,
			    plan_slug: planSlug,
			    product_name: plugin.product_name,
			    billing_cycle: parsed.billing_cycle,
			    licenses: parsed.licenses,
			    coupon: parsed.coupon,
			    trial: parsed.trial,
			    affiliation: this.options.affiliation
		    });
	    }

	    static #normalizeEventName(event){
		    return String(event || "unknown")
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
		    if (typeof document === "undefined" || typeof CustomEvent !== "function") return;
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
		    if (billingCycle !== undefined) context.billing_cycle = billingCycle;

		    const licenses = firstDefined(
			    this.#getTrackedDataValue(data, ["licenses"]),
			    this.#getTrackedDataValue(data, ["purchase", "licenses"])
		    );
		    if (licenses !== undefined) context.licenses = licenses;

		    const coupon = firstDefined(
			    this.#getTrackedDataValue(data, ["coupon"]),
			    this.#getTrackedDataValue(data, ["coupon_id"]),
			    this.#getTrackedDataValue(data, ["purchase", "coupon_id"])
		    );
		    if (coupon !== undefined) context.coupon = coupon;

		    const currency = firstDefined(
			    this.#getTrackedDataValue(data, ["currency"]),
			    this.#getTrackedDataValue(data, ["purchase", "currency"])
		    );
		    if (isString(currency)) context.currency = currency.toUpperCase();

		    return context;
	    }

	    static #handleCheckoutTrack(plugin, context, event, data){
		    const normalizedEvent = this.#normalizeEventName(event);
		    this.#applyCheckoutTrackData(plugin, context, data);
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    this.#dispatchTrackingEvent(
			    "freemius_checkout_" + normalizedEvent,
			    this.#buildEventDetail(context, normalizedEvent, {
				    freemius_event: event
			    })
		    );
	    }

	    static #getPurchaseValue(purchase){
		    if (!isPlainObject(purchase)) return undefined;
		    if (purchase.trial_ends !== undefined && purchase.trial_ends !== null) return 0;
		    if (purchase.initial_amount !== undefined && purchase.initial_amount !== null) return purchase.initial_amount;
		    return purchase.gross;
	    }

	    static #buildPurchaseContext(plugin, context, response){
		    if (!isPlainObject(response) || !isPlainObject(response.purchase)) return context;
		    const purchase = response.purchase;
		    const currency = isString(purchase.currency) ? purchase.currency.toUpperCase() : context.currency;
		    const value = this.#getPurchaseValue(purchase);
		    const purchasePlanId = firstDefined(purchase.plan_id, purchase.plan && purchase.plan.id);
		    const planSlug = purchasePlanId !== undefined ? this.#getPlanSlug(plugin, purchasePlanId) : context.plan_slug;
		    const quantity = firstDefined(purchase.licenses, context.licenses, 1);
		    const item = cleanObject({
			    item_id: context.product_slug,
			    item_name: context.product_name,
			    item_variant: planSlug,
			    item_category: "Plugin",
			    price: value,
			    quantity: quantity,
			    currency: currency
		    });
		    const purchaseContext = cleanObject(Object.assign({}, context, {
			    checkout_stage: "purchase_confirmed",
			    transaction_id: purchase.id !== undefined && purchase.id !== null ? String(purchase.id) : undefined,
			    value: value,
			    currency: currency,
			    plan_slug: planSlug,
			    coupon: firstDefined(purchase.coupon_id, context.coupon),
			    licenses: firstDefined(purchase.licenses, context.licenses),
			    item_id: context.product_slug,
			    item_name: context.product_name,
			    item_variant: planSlug,
			    item_category: "Plugin",
			    quantity: quantity,
			    price: value,
			    items: [item]
		    }));
		    Object.assign(context, purchaseContext);
		    return purchaseContext;
	    }

	    static #storePurchaseContext(detail){
		    if (typeof sessionStorage === "undefined" || !detail || !detail.checkout_id) return;
		    try {
			    sessionStorage.setItem(this.#STORAGE_PREFIX + detail.checkout_id, JSON.stringify(detail));
			    sessionStorage.setItem(this.#STORAGE_PREFIX + "latest", JSON.stringify(detail));
		    } catch (err){
			    // Storage can be disabled by browser privacy settings.
		    }
	    }

	    static #handlePurchaseCompleted(plugin, context, response){
		    const detail = this.#buildPurchaseContext(plugin, context, response);
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    this.#storePurchaseContext(detail);
		    this.#dispatchTrackingEvent("freemius_purchase_confirmed", detail);
	    }

	    static #handleCheckoutSuccess(plugin, context, response){
		    const detail = this.#buildPurchaseContext(plugin, context, response);
		    this.#CHECKOUT_CONTEXTS.set(context.checkout_id, context);
		    this.#storePurchaseContext(detail);
		    this.#dispatchTrackingEvent("freemius_checkout_success", this.#buildEventDetail(detail, "checkout_success"));

		    const successUrl = this.#getSuccessUrl(plugin, detail);
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
		    if (!checkoutId || typeof sessionStorage === "undefined") return null;
		    try {
			    const storedValue = sessionStorage.getItem(this.#STORAGE_PREFIX + checkoutId);
			    if (!storedValue) return null;
			    const stored = JSON.parse(storedValue);
			    return isPlainObject(stored) ? stored : null;
		    } catch (err){
			    return null;
		    }
	    }

	    static #getThankYouDetailFromUrl(){
		    if (typeof window === "undefined" || !window.location || !window.location.search) return null;
		    const params = isPlainObject(this.options.success_url_params) ? this.options.success_url_params : {};
		    const urlParams = new URLSearchParams(window.location.search);
		    const checkoutId = urlParams.get(params.checkout_id || "fs_checkout_id");
		    const productSlug = urlParams.get(params.product_slug || "fs_product");
		    if (!checkoutId || !productSlug || !this.#isCurrentSuccessUrl(productSlug)) return null;

		    const stored = this.#getStoredPurchaseContext(checkoutId);
		    if (!stored || stored.checkout_id !== checkoutId || stored.product_slug !== productSlug) return null;

		    const planSlug = urlParams.get(params.plan_slug || "fs_plan");
		    if (planSlug && stored.plan_slug && planSlug !== stored.plan_slug) return null;

		    const transactionId = urlParams.get(params.transaction_id || "fs_transaction");
		    if (transactionId && stored.transaction_id && transactionId !== stored.transaction_id) return null;

		    return cleanObject(Object.assign({}, stored, {
			    checkout_id: checkoutId,
			    category: "freemius_checkout",
			    product_slug: productSlug,
			    plan_slug: planSlug || stored.plan_slug || this.options.default_plan,
			    transaction_id: transactionId || stored.transaction_id,
			    checkout_stage: "thank_you_viewed",
			    freemius_event: "thank_you_viewed"
		    }));
	    }

	    static #dispatchThankYouEvent(){
		    if (this.#THANK_YOU_DISPATCHED) return;
		    const detail = this.#getThankYouDetailFromUrl();
		    if (!detail) return;
		    this.#THANK_YOU_DISPATCHED = true;
		    if (typeof sessionStorage !== "undefined" && detail.checkout_id){
			    try {
				    const sentKey = this.#STORAGE_PREFIX + "thank_you:" + detail.checkout_id;
				    if (sessionStorage.getItem(sentKey)) return;
				    sessionStorage.setItem(sentKey, "1");
			    } catch (err){
				    // Storage can be disabled by browser privacy settings.
			    }
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
