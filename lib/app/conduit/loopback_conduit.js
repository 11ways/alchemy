/**
 * The Loopback Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.5
 *
 * @param    {Conduit}   parent_conduit
 */
var LoopConduit = Function.inherits('Alchemy.Conduit', function Loopback(parent_conduit) {

	// Keep a reference to the parent conduit
	this.parent = parent_conduit;

	// Call the parent constructor, only after setting the parent conduit!
	Loopback.super.call(this);

	// The callback that should receive the end message
	this.callback = null;

	// Assign the parent properties to this loopback
	this.copyParentProperties(parent_conduit);

	if (this.request) {
		let req = Object.create(this.request);
		req.conduit = this;
		this.request = req;
	}
});

/**
 * Create a new loopback
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Alchemy.Conduit.Conduit}   parent
 * @param    {Object}                    options
 * @param    {Function}                  callback
 *
 * @return   {Alchemy.Conduit.Loopback}
 */
LoopConduit.setStatic(function create(parent, options, callback) {

	let loopback = new LoopConduit(parent);

	return loopback.setOptions(options, callback);
});

/**
 * Copy parent properties
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.5
 * @version  1.1.5
 *
 * @param    {Conduit}   conduit
 */
LoopConduit.setMethod(function copyParentProperties(conduit) {

	//this._debugObject = conduit._debugObject;
	this._debugConduitInitialize = conduit._debugObject;

	this.headers = conduit.headers;
	this.cookies = conduit.cookies;
	this.scene_id = conduit.scene_id;

	this.languages = this.parent.languages;
	this.locales = this.parent.locales;
	this.active_prefix = this.parent.active_prefix;

	this.request = conduit.request;
});

/**
 * Set the loopback options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.5
 *
 * @param    {Object}      options
 * @param    {Function}    callback
 *
 * @return   {Alchemy.Conduit.Loopback}
 */
LoopConduit.setMethod(function setOptions(options, callback) {

	let that = this,
	    promise,
	    route,
	    info,
	    key;

	for (key in options) {
		let set_method = false;

		info = Classes.Develry.Request.getMethodInfo(key);

		if (info && options[key]) {

			if (info.method == 'get' && set_method) {
				// Ignore
			} else {
				this.method = key;
				set_method = true;
			}

			if (info.has_body && typeof options[key] == 'object') {
				this.body = options[key];
			}
		}
	}

	if (!this.method) {
		this.method = 'get';
	}

	if (options.name) {
		// @TODO: what about path sections?
		//route = this.getRouteByName(options.name);

		// @WARNING: It's best to just generate the URL
		// and let it parse all the information that way
		options.href = alchemy.routeUrl(options.name, options.params, {extra_get_parameters: false});
	}

	if (options.href) {

		this.original_url = RURL.parse(options.href);

		this.url = this.original_url;
		this.original_path = this.url.path;
		this.original_pathname = this.url.pathname;
		this.route = null;

		this.parseShortcuts();
		this.parseLanguages();
		this.parsePrefix();
		this.parseSection();

		promise = this.parseRoute();
	}

	if (options.body) {
		this.body = options.body;
	}

	if (options.params) {
		this.params = options.params;
	}

	if (options.arguments) {
		this.loopback_arguments = options.arguments;
	}

	if (callback) {
		this.setCallback(callback);
	}

	Classes.Pledge.done(promise, function whenDone(err) {
		that.callMiddleware();
	});

	return this;
});

/**
 * Set a function that should receive the end message
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
LoopConduit.setMethod(function setCallback(callback) {

	this.callback = callback;

	if (this.end_message) {
		this.callback(null, this.end_message);
	}
});

/**
 * Pass along the message
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.3
 */
LoopConduit.setMethod(function end(message) {

	if (Object.isObject(message)) {
		message = JSON.clone(message, 'toHawkejs');
	}

	return this._end(message);
});

/**
 * Call the actual end method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
LoopConduit.setMethod(function _end(message) {
	if (this.callback) {
		this.callback(null, message);
	} else {
		this.end_message = message;
	}
});

/**
 * Catch errors
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
LoopConduit.setMethod(function error(status, message, print_error) {

	if (this.callback) {
		this.callback(status);
	} else {
		this.end(message);
	}
});