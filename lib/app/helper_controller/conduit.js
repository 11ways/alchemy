/**
 * The Conduit class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Conduit = Function.inherits('Alchemy.Client.Base', function Conduit(url, options) {

	// Reference to ourselves
	this.conduit = this;

	// Open url options
	this.options = options || {};

	// The original requested url
	this.url = url;

	// New cookies
	this.new_cookies = {};

	// The headers to "send"
	this.response_headers = {};

	// Parameter overrides
	this.param_overrides = {};
});

/**
 * The "body" property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setProperty(function body() {

	var opts = this.options,
	    data = opts.post || opts.put || opts.options || opts.patch || opts.body;

	if (!data) {
		data = opts.body = {};
	}

	return data;
}, false);

/**
 * The "view_render" property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setProperty(function view_render() {

	if (!this._view_render) {
		this._view_render = hawkejs.createViewRender();

		// Pass url parameters to the client
		this._view_render.internal('url', this.url);
	}

	return this._view_render;
}, false);

/**
 * Get a parameter from the route, post or get query or cookie
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value   Overrides the value if set
 */
Conduit.setMethod(function param(name, value) {

	var length = arguments.length;

	if (length == 0) {
		return Object.assign({}, this.params, this.url.query, this.body);
	} else if (length == 2) {
		if (!this.param_overrides) {
			this.param_overrides = {};
		}

		this.param_overrides[name] = value;
		return;
	}

	if (this.param_overrides && this.param_overrides[name] != null) {
		return this.param_overrides[name];
	}

	if (this.body && this.body[name] != null) {
		return this.body[name];
	}

	if (this.url && this.url.query && this.url.query[name] != null) {
		return this.url.query[name];
	}

	if (this.params && this.params[name] != null) {
		return this.params[name];
	}

	return this.cookie(name);
});


/**
 * Set a variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function set(name, value) {

	if (arguments.length == 1) {
		return this.view_render.set(name);
	}

	return this.view_render.set(name, value);
});

/**
 * Set an internal variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function internal(name, value) {

	if (arguments.length == 1) {
		return this.view_render.internal(name);
	}

	return this.view_render.internal(name, value);
});

/**
 * Expose a variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function expose(name, value) {

	if (arguments.length == 1) {
		return this.view_render.expose(name);
	}

	return this.view_render.expose(name, value);
});


if (Blast.isNode) {
	return;
}

/**
 * End the call
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value   Overrides the value if set
 */
Conduit.setMethod(function end(message) {
	if (this.callback) {
		return this.callback(null, message);
	}
});

/**
 * Get/set cookies
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value   Overrides the value if set
 */
Conduit.setMethod(function cookie(name, value) {
	return hawkejs.scene.cookie.apply(hawkejs.scene, arguments);
});

/**
 * Throw an error
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Nulber}  status       Response statuscode
 * @param    {Error}   message      Optional error to send
 */
Conduit.setMethod(function error(status, message) {

	if (typeof status != 'number') {
		message = status;
	}

	throw new Error(message);
});

/**
 * Get the alchemy routes, compile paths
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
Hawkejs.Scene.setMethod(function getAlchemyRoutes() {

	var exposed_routes = hawkejs.scene.exposed.routes,
	    section_name,
	    section,
	    prefix,
	    route,
	    name;

	if (this._alchemy_routes && this._alchemy_routes == exposed_routes) {
		return exposed_routes;
	}

	for (section_name in exposed_routes) {
		section = exposed_routes[section_name];

		for (name in section) {
			route = section[name];
			route.compiled_paths = {};

			for (prefix in route.paths) {
				route.compiled_paths[prefix] = new Blast.Classes.Alchemy.PathDefinition(route.paths[prefix], {end: true});
			}
		}
	}

	this._alchemy_routes = exposed_routes;
	return exposed_routes;
});

/**
 * Intercept Scene#openUrl calls
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.Scene.setMethod(function interceptOpenUrl(url, options) {

	var section_name,
	    path_prefix,
	    section,
	    conduit,
	    prefix = '',
	    routes,
	    pledge,
	    tasks,
	    route,
	    path = url.pathname,
	    key;

	pledge = new Blast.Classes.Pledge();

	for (key in hawkejs.scene.exposed.prefixes) {
		path_prefix = '/' + key + '/';

		if (path.startsWith(path_prefix)) {
			prefix = key;
			path = '/' + path.after(path_prefix);
			break;
		}
	}

	routes = this.getAlchemyRoutes();
	tasks = [];

	// @TODO: paths should have the same order as on the server
	for (section_name in routes) {
		section = routes[section_name];

		Object.each(section, function eachRoute(route, section_name) {
			var definition = route.compiled_paths[prefix];

			if (!definition) {
				return;
			}

			tasks.push(function testDefinition(next) {

				var temp = definition.test(path, conduit);

				if (!temp) {
					return next();
				}

				if (temp.then) {
					return temp.then(function resolved(value) {

						if (!value) {
							return next(null);
						}

						doRoute(route, value, next);
					}).catch(function rejected(err) {
						return next(err);
					});
				}

				doRoute(route, temp, next);
			});
		});
	}

	if (tasks.length) {
		conduit = new Conduit(url, options);
	}

	Function.series(tasks, function done(err) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.reject('No matching client-side route found');
	});

	function doRoute(route, value, next) {

		var controller;

		if (!route.controller || !route.action) {
			return next();
		}

		controller = Blast.Classes.Alchemy.Client.Controller[route.controller];

		if (!controller || !controller.actions[route.action]) {
			return next();
		}

		// Put conduit back on top
		value.unshift(conduit);

		// Create the controller instance
		controller = new controller(conduit);

		// See if a render root element is given
		if (options.root) {
			controller.view_render.root = options.root;
		}

		// Add the callback
		conduit.callback = function callback(err, result) {
			if (err) {
				pledge.reject(err);
			}

			pledge.resolve(result);
		};

		// Call the action
		try {
			controller.constructor.actions[route.action].apply(controller, value);
		} catch (err) {
			console.error('Error executing client-side action "' + route.action + '":', err);
		}
	}

	return pledge;
});