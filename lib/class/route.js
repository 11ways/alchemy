/**
 * Route Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.5
 */
var Route = Function.inherits('Alchemy.Base', function Route(router, paths, options) {

	// Store the parent router
	this.router = router;

	// Store the route options
	this.options = options;

	// This is not middleware by default
	this.is_middleware = options.is_middleware || false;

	// The methods to listen to
	this.methods = null;

	// The paths to listen to
	this.paths = null;

	// The weight of this route (read-only)
	this.weight = null;

	// Is this route prefix-aware?
	this.is_prefix_aware = false;

	// The name of this route
	this.name = null;

	// The optional function
	this.fnc = null;

	// All the keys used
	this.keys = null;

	// The breadcrumb string
	this.breadcrumb = '';
	this.has_breadcrumb_assignments = false;

	// The optional permissions to check
	this.permission = null;
	this.has_permission_assignments = false;

	// If no fnc is given, these will be called
	this.controller = null;
	this.action = null;

	this.setPaths(paths);
});

/**
 * Deprecated property names
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Route.setDeprecatedProperty('isMiddleware', 'is_middleware');

/**
 * Set the breadcrumb for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   breadcrumb
 */
Route.setMethod(function setBreadcrumb(breadcrumb) {

	var assignments;

	if (!breadcrumb) {
		breadcrumb = '';
	} else {
		// See if this breadcrumb has assignments
		assignments = breadcrumb.assignments();

		if (assignments.length) {
			this.has_breadcrumb_assignments = true;
		}
	}

	this.breadcrumb = breadcrumb;
});

/**
 * Set the permissions for this route
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {String|String[]}   permission
 */
Route.setMethod(function setPermission(permission) {

	if (!permission) {
		return;
	}

	permission = Array.cast(permission);

	this.permission = permission;

	for (let entry of permission) {
		let assignments = entry.assignments();

		if (assignments.length) {
			this.has_permission_assignments = true;
			break;
		}
	}
});

/**
 * Compile paths for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setPaths(paths) {

	// Certain routes (like socket only routes)
	// have no paths
	if (paths == null) {
		return;
	}

	let definition,
	    prefix,
	    keys = [],
	    path;

	if (!Object.isPlainObject(paths)) {
		paths = {'': paths};
	} else {
		this.is_prefix_aware = true;
	}

	// Reset the paths
	this.paths = {};

	for (prefix in paths) {
		path = paths[prefix];
		definition = new Classes.Alchemy.PathDefinition(path, {end: !this.is_middleware});
		this.paths[prefix] = definition;

		if (definition.keys.length) {
			keys.include(definition.keys);
		}
	}

	// Only use the unique values
	this.keys = keys.unique();
});

/**
 * Match the given path & prefix to this route,
 * and return the in-url named parameters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.3
 *
 * @param    {String}   method
 * @param    {String}   path     The path (without the prefix)
 * @param    {String}   prefix   The prefix name
 *
 * @return   {Boolean|Object}    False if it doesn't match, or named params
 */
Route.setMethod(function match(conduit, method, path, prefix) {

	var definition,
	    params,
	    pledge,
	    result,
	    temp,
	    type,
	    i;

	if (this.methods && this.methods.indexOf(method) == -1) {
		return false;
	}

	result = false;

	if (!prefix) {
		prefix = '';
	}

	path = path.before('?') || path;

	// If this route isn't prefix aware, but a prefix was detected in the route,
	// see if we can add it
	if (!this.is_prefix_aware && prefix) {

		// Prepend the prefix ONLY if the path doesn't equal the prefix already
		// For example: don't turn "/nl" into "/nl/nl"
		if (path != ('/' + prefix)) {
			path = '/' + prefix + path;
		}

		prefix = '';
	}

	if (this.paths[prefix]) {

		// Get the path definition, including the regex & keys array
		definition = this.paths[prefix];

		// Test it
		temp = definition.test(path, conduit);

		if (!temp) {
			return false;
		}

		if (temp.then) {
			pledge = new Blast.Classes.Pledge();

			temp.then(function gotValue(values) {

				if (!values) {
					return pledge.resolve(null);
				}

				pledge.resolve({
					definition          : definition,
					parameters          : definition.getParametersObject(values),
					original_parameters : definition.getParametersObject(values, 'original_value'),
					parameters_array    : values
				});
			});

			temp.catch(function onError(err) {
				pledge.reject(err);
			});

			return pledge;
		}

		result = {
			definition          : definition,
			parameters          : definition.getParametersObject(temp),
			original_parameters : definition.getParametersObject(temp, 'original_value'),
			parameters_array    : temp
		};
	}

	return result;
});


/**
 * Set handler
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setHandler(fnc) {

	var assignments,
	    split;

	if (typeof fnc === 'function') {
		this.fnc = fnc;
		return;
	}

	// Strings like 'StaticController#index'
	if (typeof fnc === 'string') {

		split = fnc.split('#');
		this.controller = split[0];
		this.action = split[1];

		// See if there are assignments in the string
		assignments = fnc.assignments();

		// If there are assignments,
		// the controller & action will be different upon each request
		if (assignments.length) {
			this.fnc = this.callControllerAssignments;
		} else {
			this.fnc = this.callController;
		}
	}
});

/**
 * Check the policy
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.1.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function checkPolicy(conduit) {

	var policy = this.options.policy;

	if (!policy) {
		return true;
	}

	if (policy == 'logged_in') {
		let user_data = conduit.session('UserData');

		if (user_data && user_data.$pk) {
			return true;
		}
	} else if (typeof policy == 'function') {
		return policy.call(this, conduit);
	}

	return false;
});

/**
 * Check the permission
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function checkPermission(conduit) {

	// Check the rouer section first
	if (!this.router.checkPermission(conduit)) {
		return false;
	}

	if (!this.permission) {
		return true;
	}

	let permission;

	for (permission of this.permission) {

		if (this.has_permission_assignments) {
			permission = permission.assign(conduit.route_string_parameters).toLowerCase();
		}

		if (conduit.hasPermission(permission)) {
			return true;
		}
	}

	return false;
});

/**
 * Call the handler for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.5
 *
 * @param    {Conduit}   conduit
 * @param    {Array}     parameters
 */
Route.setMethod(async function callHandler(conduit, parameters) {

	var breadcrumb,
	    parameters,
	    keys,
	    i;

	if (this.fnc) {

		if (!this.checkPermission(conduit)) {

			let user = conduit.session('UserData');

			if (!user) {
				return conduit.notAuthorized();
			} else {
				return conduit.forbidden();
			}
		}

		if (this.options.policy && !await this.checkPolicy(conduit)) {
			return conduit.notAuthorized();
		}

		// If a client-side render is preferred and a layout is given,
		// only render the layout
		if (Blast.isNode && !conduit.ajax && this.options.prefer == 'client' && this.options.layout) {
			conduit.internal('force_client_render', true);
			return conduit.render(this.options.layout);
		}

		// If no arguments are given as an array,
		// construct them if needed
		if (!parameters) {

			// If this is a socket call, and there are no parameters,
			// use the body
			// @TODO: what about streams?
			if (this.methods.indexOf('socket') > -1) {

				if (conduit.loopback_arguments) {
					parameters = conduit.loopback_arguments;
				} else {
					parameters = Array.cast(conduit.body);
				}

				// Add the end method
				parameters.push(function cb(err) {

					var args;

					if (err) {
						return conduit.error(err);
					}

					args = Array.cast(arguments);
					args.shift();

					conduit.end.apply(conduit, args);
				});

			} else {

				// Old-style path definitions made from regexes have no named
				// parameters, so use their indexes as keys
				if (conduit.path_definition.from_regex) {
					keys = Object.keys(conduit.params);
				} else {
					keys = conduit.path_definition.keys;
				}

				parameters = new Array(keys.length);

				for (i = 0; i < keys.length; i++) {
					parameters[i] = conduit.params[keys[i]];
				}
			}
		}

		if (this.breadcrumb) {

			breadcrumb = this.breadcrumb;

			if (this.has_breadcrumb_assignments) {
				conduit.internal('breadcrumb_pattern', breadcrumb);

				// @TODO: {[Document]slug} parameters will be Documents,
				// so this results in [Object object] strings!
				breadcrumb = breadcrumb.assign(conduit.route_string_parameters).toLowerCase();
			}

			if (breadcrumb) {

				// Set the breadcrumb path
				conduit.internal('breadcrumb', breadcrumb);
			}
		}

		return this.fnc(conduit, ...parameters);
	}

	throw new Error('No valid handler was found');
});

/**
 * Generate a url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.5.0
 *
 * @param    {Object}                  parameters  (optional)
 * @param    {Object|Alchemy.Conduit}  conduit     Conduit or options (optional)
 */
Route.setMethod(function generateUrl(parameters, conduit) {

	var locale,
	    mount,
	    path,
	    url,
	    i;

	// Use the "no locale" by default
	locale = '';

	// If a conduit is given, get the locale
	if (conduit) {
		if (conduit.locales) {
			for (i = 0; i < conduit.locales.length; i++) {
				if (this.paths[conduit.locales[i]]) {
					locale = conduit.locales[i];
					break;
				}
			}
		}

		if (!locale && conduit.locale) {
			locale = conduit.locale;
		}
	}

	// Get the path to use for the url generation
	path = this.paths[locale];

	if (!path) {
		return null;
	}

	if (path && path.source) {
		path = path.source;
	}

	// Remove type definitions from the path
	path = path.replace(/\[.*\]\:/g, ':');

	if (!parameters && conduit) {
		if (conduit.param) {
			parameters = conduit.param();
		} else if (conduit.parameters) {
			paramers = conduit.parameters;
		}
	}

	if (parameters) {
		url = path.fillPlaceholders(parameters, true);
	} else {
		url = path;
	}

	mount = this.router.getFullMount();

	if (mount.length > 1) {
		url = mount + url;
	}

	if (locale) {
		url = '/' + locale + url;
	}

	return url;
});

/**
 * Call a controller action as handler.
 * This gets called by `callHandler`.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function callController(conduit) {

	var instance,
	    args,
	    i;

	if (this.controller) {
		instance = Controller.get(this.controller, conduit);

		if (!instance) {
			return conduit.error(new Error('Could not find controller "' + this.controller + '"'));
		}

		args = new Array(arguments.length);

		for (i = 0; i < args.length; i++) {
			args[i] = arguments[i];
		}

		return instance.doAction(this.action, args);
	}

	conduit.error(new Error('No valid controller was set'));
});

/**
 * Call a controller action as handler, but get info from the url first.
 * This gets called by `callHandler`.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function callControllerAssignments(conduit) {

	var controller,
	    instance,
	    action,
	    args,
	    i;

	if (this.controller) {

		// Get the controller name from the route parameters
		controller = this.controller.assign(conduit.params);

		// Try getting a controller instance
		instance = Controller.get(controller, conduit);

		if (!instance) {
			throw new Error('Could not find controller "' + controller + '"');
		}

		args = new Array(arguments.length);

		for (i = 0; i < args.length; i++) {
			args[i] = arguments[i];
		}

		action = this.action.assign(conduit.params);
		return instance.doAction(action, args);
	}

	throw new Error('No valid controller was set');
});