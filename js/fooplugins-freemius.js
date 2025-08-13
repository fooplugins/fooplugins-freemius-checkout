(function(FS, CONFIG){

    if (!FS || !FS.Checkout){
	    console.error("Freemius Checkout API must be loaded prior to this script.");
	    return;
    }

    function isString(value){
	    return typeof value === "string";
    }

    function hasOwnProperties(target, properties){
	    return properties.every(function(prop){
		    return target.hasOwnProperty(prop);
	    });
    }

    function removeProperties(target, properties){
	    properties.forEach(function(prop){
		    if (target.hasOwnProperty(prop)){
			    delete target[prop];
		    }
	    });
	    return target;
    }

    class FooCheckout {
	    /**
	     * A map of product_id to handler.
	     * @private
	     * @type {Map<Number, FS.Checkout>}
	     */
	    static #HANDLERS = new Map();
	    /**
	     * The Regular Expressions used to parse the url.
	     * @private
	     * @type {{plugin_plan_licenses: RegExp, billing_cycle: RegExp, trial: RegExp}}
	     */
	    static #REGEX = {
		    plugin_plan_licenses: /\/(?:plugin|bundle)\/(\d+?)\/plan\/(\d+?)(?:\/licenses\/(\d+?))?(?:\/|$)/,
		    billing_cycle: /[?&]billing_cycle=(monthly|annual|lifetime)(?:$|&)/,
		    trial: /[?&]trial=(1|true)($|&)/,
			coupon: /[?&]coupon=(\w+)(?:$|&)/
	    };

		/**
		 * The current options for the plugin.
		 * @type {{selector: string, plugins: [], success_url: ?string, affiliation: ?string}}
		 */
	    static options = {
		    selector: "a[href^='https://checkout.freemius.com/']",
		    plugins: [],
		    success_url: null,
		    affiliation: null
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

	    /**
	     * Initialize the plugin finding and binding all checkout links in the page.
	     * @param options
	     */
	    static init(options){
		    const self = this;
		    if (options) self.configure(options);
		    const links = document.querySelectorAll(self.options.selector);
		    links.forEach(function(link){
			    link.addEventListener("click", function(e){
				    if (self.open(e.target)){
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
		    const parsed = this.parse(link.href);
		    if (parsed){
			    const plugin = this.options.plugins.find(function(p){
				    return p.product_id === parsed.product_id;
			    });
			    if (plugin){
				    const handler = this.#getHandler(plugin);
				    if (handler){
					    handler.open(parsed);
					    return true;
				    }
			    }
		    }
		    return false;
	    }

	    /**
	     * Parses the supplied href into the options required to open a Freemius checkout.
	     * @param {string} href
	     * @returns {{product_id: number, licenses: number, billing_cycle: string, plan_id: number, trial: boolean}}
	     */
	    static parse(href){
		    const result = href.match(this.#REGEX.plugin_plan_licenses);
		    if (result !== null){
			    const billing_cycle_match = href.match(this.#REGEX.billing_cycle);
			    let billing_cycle = "annual";
			    if (billing_cycle_match !== null){
				    billing_cycle = billing_cycle_match[1];
			    }
				const coupon_match = href.match(this.#REGEX.coupon);
			    let coupon = undefined;
			    if (coupon_match !== null){
				    coupon = coupon_match[1];
			    }
			    return {
				    product_id: parseInt(result[1]),
				    plan_id: parseInt(result[2]),
				    licenses: result[3] ? parseInt(result[3]) : 1, // Default to 1 license if not specified
				    billing_cycle: billing_cycle,
				    trial: this.#REGEX.trial.test(href),
					coupon
			    };
		    }
	    }

	    /**
	     * Gets the Freemius checkout handler for the supplied plugin or creates it if one does not exist.
	     * @param {{product_id: number, public_key: string, product_name: string, success_url: ?string}} plugin
	     * @returns {FS.Checkout}
	     */
	    static #getHandler(plugin){
		    const self = this;
		    if (self.#HANDLERS.has(plugin.product_id)){
			    return self.#HANDLERS.get(plugin.product_id);
		    }
		    const config = Object.assign({
			    purchaseCompleted: function(response){
				    self.#sendAnalytics(plugin.product_name, response);
			    },
			    success: function(){
					const success_url = plugin.success_url || self.options.success_url;
					if (isString(success_url)){
					    location.href = success_url;
				    }
			    }
		    }, plugin);

            removeProperties(config, ["product_name","success_url"]);
		    const handler = new FS.Checkout(config);
		    self.#HANDLERS.set(plugin.product_id, handler);
		    return handler;
	    }

	    /**
	     * Checks various options and sends analytics if possible.
	     * @param {string} productName
	     * @param {Object} response
	     */
	    static #sendAnalytics(productName, response){
		    const self = this;
		    if (isString(self.options.affiliation) && isString(productName)){
				var isTrial = null != response.purchase.trial_ends,
				isSubscription = null != response.purchase.initial_amount,
				total = isTrial
					? 0
					: (isSubscription
							? response.purchase.initial_amount
							: response.purchase.gross
					  ).toString();
				
				// Facebook Pixel tracking code.
				if (typeof fbq !== 'undefined') {
					fbq('track', 'Purchase', {
						currency: response.purchase.currency.toUpperCase(),
						value: total,
					});
				}

				// The new GA4 gtag based tracking code.
				if (typeof gtag !== 'undefined') {
					gtag('event', 'purchase', {
						transaction_id: response.purchase.id.toString(), // Transaction ID. Required.
						affiliation: self.options.affiliation, // Affiliation or store name.
						value: total, // Grand Total.
						shipping: 0, // Shipping.
						tax: 0, // Tax.
						currency: response.purchase.currency.toUpperCase(), // Currency.
						items: [
							{
								item_id: response.purchase.plugin_id.toString(), // SKU/code.
								item_variant: response.purchase.plan_id.toString(), // SKU/code.
								item_name: productName, // Product name. Required.
								item_category: 'Plugin', // Category or variation.
								price: total, // Unit price.
								quantity: 1, // Quantity
								currency: response.purchase.currency.toUpperCase(), // Currency.
							},
						],
					});
				}
		    }
	    }
    }

    window.FooCheckout = FooCheckout;

    FooCheckout.ready(function(self){
	    self.configure(CONFIG);
	    self.init();
    });

})(window.FS, window.FOOCHECKOUT);