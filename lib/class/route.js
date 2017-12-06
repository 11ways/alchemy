var pathToRegexp = alchemy.use('path-to-regexp');

/**
 * Route Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 */
var Route = Function.inherits('Alchemy.Base', function Route(router, paths, options) {

	// Store the parent router
	this.router = router;

	// Store the route options
	this.options = options;

	// This is not middleware by default
	this.isMiddleware = false;

	// The methods to listen to
	this.methods = null;

	// The paths to listen to
	this.paths = null;

	// The weight of this route (read-only)
	this.weight = null;

	// The name of this route
	this.name = null;

	// The optional function
	this.fnc = null;

	// The breadcrumb string
	this.breadcrumb = '';
	this.has_breadcrumb_assignments = false;

	// If no fnc is given, these will be called
	this.controller = null;
	this.action = null;

	this.setPaths(paths);
});

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
 * Compile paths for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setPaths(paths) {

	var normalized,
	    has_types,
	    prefix,
	    pieces,
	    types,
	    regex,
	    keys,
	    path,
	    temp,
	    key;

	// Certain routes (like socket only routes)
	// have no paths
	if (paths == null) {
		return;
	}

	if (!Object.isPlainObject(paths)) {
		paths = {'': paths};
	}

	// Reset the paths
	this.paths = {};

	for (prefix in paths) {
		path = paths[prefix];

		types = [];
		keys = [];

		if (path instanceof RegExp) {
			normalized = path;
			has_types = false;
		} else {
			// Split the path at every new variable
			pieces = path.split(':');

			if (pieces.length == 1) {
				normalized = path;
			} else {
				normalized = '';

				pieces.forEach(function eachPiece(piece, index) {

					var type;

					// Extract the type for this piece
					type = /\[(.*)\]$/.exec(piece);

					if (type) {
						has_types = true;
						type = type[1];
						normalized += piece.replace(/\[(.*)\]$/, '');
					} else {
						normalized += piece;
					}

					// If it's not the last piece, add a colon
					if (index != (pieces.length - 1)) {
						types.push(type);
						normalized += ':';
					}
				});
			}
		}

		// If no specific types are set, set the array to false
		if (!has_types) {
			types = false;
		}

		regex = pathToRegexp(normalized, keys);

		this.paths[prefix] = {
			keys: keys,
			regex: regex,
			source: path,
			prefix: prefix,
			types: types,
		};
	}
});

/**
 * Match the given path & prefix to this route,
 * and return the in-url named parameters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {String}   method
 * @param    {String}   path     The path (without the prefix)
 * @param    {String}   prefix   The prefix name
 *
 * @return   {Boolean|Object}    False if it doesn't match, or named params
 */
Route.setMethod(function match(method, path, prefix) {

	var config,
	    params,
	    temp,
	    type,
	    i;

	if (this.methods && this.methods.indexOf(method) == -1) {
		return false;
	}

	if (!prefix) {
		prefix = '';
	}

	path = path.before('?') || path;

	if (this.paths[prefix]) {

		// Get the path config, including the regex & keys array
		config = this.paths[prefix];

		// Execute the regex
		temp = config.regex.exec(path);

		if (!temp) {
			return false;
		}

		// Now check for types
		if (config.types) {
			for (i = 0; i < config.types.length; i++) {
				type = config.types[i];

				if (!type) {
					continue;
				}

				// Check the parameter type
				switch (type) {
					case 'ObjectId':
						if (!alchemy.castObjectId(decodeURIComponent(temp[i+1]))) {
							return false;
						}
						break;

					case 'Number':
						if (!Number(decodeURIComponent(temp[i+1]))) {
							return false;
						}
						break;
				}
			}
		}

		params = {};

		for (i = 0; i < config.keys.length; i++) {
			params[config.keys[i].name] = decodeURIComponent(temp[i+1]);
		}

		return {paramsConfig: config, params: params};
	}

	return false;
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
 * Call the handler for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Conduit}   conduit
 * @param    {Array}     paramArgs
 */
Route.setMethod(function callHandler(conduit, paramArgs) {

	var breadcrumb,
	    paramArgs,
	    keys,
	    i;

	if (this.fnc) {

		// If no arguments are given as an array,
		// construct them if needed
		if (!paramArgs) {

			// If this is a socket call, and there are no parameters,
			// use the body
			// @TODO: what about streams?
			if (this.methods.indexOf('socket') > -1) {

				if (conduit.loopback_arguments) {
					paramArgs = conduit.loopback_arguments;
				} else {
					paramArgs = Array.cast(conduit.body);
				}

				// Add the end method
				paramArgs.push(function cb(err) {

					var args;

					if (err) {
						return conduit.error(err);
					}

					args = Array.cast(arguments);
					args.shift();

					conduit.end.apply(conduit, args);
				});

			} else {
				keys = conduit.paramsConfig.keys;
				paramArgs = new Array(keys.length);

				for (i = 0; i < keys.length; i++) {
					paramArgs[i] = conduit.params[keys[i].name];
				}
			}
		}

		breadcrumb = this.breadcrumb;

		if (this.has_breadcrumb_assignments) {
			conduit.internal('breadcrumb_pattern', breadcrumb);
			breadcrumb = breadcrumb.assign(conduit.params).toLowerCase();
		}

		// Set the breadcrumb path
		conduit.internal('breadcrumb', breadcrumb);

		switch (paramArgs.length) {
			case 0:
				return this.fnc(conduit);

			case 1:
				return this.fnc(conduit, paramArgs[0]);

			case 2:
				return this.fnc(conduit, paramArgs[0], paramArgs[1]);

			default:
				return this.fnc.apply(this, [conduit].concat(paramArgs));
		}
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
 * @version  0.2.0
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
			throw new Error('Could not find controller "' + this.controller + '"');
		}

		args = new Array(arguments.length);

		for (i = 0; i < args.length; i++) {
			args[i] = arguments[i];
		}

		return instance.doAction(this.action, args);
	}

	throw new Error('No valid controller was set');
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