/**
 * The Loopback Conduit Class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Refer to the parent conduit for the session_instance property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 */
LoopConduit.setProperty(function session_instance() {
	return this.parent.session_instance;
});

/**
 * Create a new loopback
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.4.0
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

	// Always clone the options
	options = JSON.clone(options);

	for (key in options) {

		// Keep track if a request method has been set
		let got_method = false;

		info = Classes.Develry.Request.getMethodInfo(key);

		if (info && options[key]) {

			if (info.method == 'get' && got_method) {
				// If a request method has already been set,
				// do not let `get` options overwrite it!
			} else {
				this.method = key;
				got_method = true;
			}

			if (info.has_body && typeof options[key] == 'object') {
				this.body = options[key];
			}
		}
	}

	if (options.method) {
		this.method = options.method;
	}

	let route_params = options.params;

	if (options.name) {
		// @TODO: what about path sections?
		route = this.getRouteByName(options.name);

		if (route && !this.method) {
			if (route.methods.length == 1) {
				this.method = route.methods[0];
			} else if (options.body && route.methods.indexOf('post') > -1) {
				this.method = 'post';
			} else {
				this.method = route.methods[0];
			}
		}

		// @WARNING: It's best to just generate the URL
		// and let it parse all the information that way
		options.href = this.routeUrl(options.name, route_params, {extra_get_parameters: false});
	}

	if (!this.method) {
		this.method = 'get';
	}

	if (options.href) {

		this.original_url = RURL.parse(options.href);

		if (options.get && typeof options.get == 'object') {
			this.original_url.addQuery(options.get);
		}

		this.url = this.original_url;
		this.original_path = this.url.path;
		this.original_pathname = this.url.pathname;
		this.route = null;

		this.parseShortcuts();
		this.parseLanguages();
		this.parsePrefix();
		this.parseSection();

		promise = this.parseRoute();
	} else if (options.get && typeof options.get == 'object') {
		if (!this.params) {
			this.params = {};
		}

		Object.assign(this.params, options.get);
	}

	if (options.body) {
		this.body = options.body;
	}

	if (route_params) {
		this.setRouteParameters(route_params);
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

/**
 * Create a session
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {boolean}   create   Create a session if none exist
 *
 * @return   {UserSession}
 */
LoopConduit.setMethod(function getSession(allow_create = true) {
	return this.parent.getSession(allow_create);
});