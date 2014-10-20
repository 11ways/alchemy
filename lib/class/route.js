var pathToRegexp = alchemy.use('path-to-regexp');

/**
 * Route Class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Route = Function.inherits(function Route(router, paths, options) {

	// Store the parent router
	this.router = router;

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

	// If no fnc is given, these will be called
	this.controller = null;
	this.action = null;

	this.setPaths(paths);
});

/**
 * Compile paths for this route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setPaths(paths) {

	var prefix,
	    regex,
	    keys,
	    path,
	    key;

	if (!Object.isPlainObject(paths)) {
		paths = {'': paths};
	}

	// Reset the paths
	this.paths = {};

	for (prefix in paths) {
		path = paths[prefix];

		keys = [];
		regex = pathToRegexp(path, keys);

		this.paths[prefix] = {
			keys: keys,
			regex: regex,
			source: path,
			prefix: prefix
		};
	}
});

/**
 * Match the given path & prefix to this route,
 * and return the in-url named parameters
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   path     The path (without the prefix)
 * @param    {String}   prefix   The prefix name
 *
 * @return   {Boolean|Object}    False if it doesn't match, or named params
 */
Route.setMethod(function match(path, prefix) {

	var config,
	    params,
	    temp,
	    i;

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

		params = {};

		for (i = 0; i < config.keys.length; i++) {
			params[config.keys[i].name] = temp[i+1];
		}

		return {paramsConfig: config, params: params};
	}

	return false;
});


/**
 * Set handler
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function callHandler(conduit) {

	var paramArgs,
	    keys,
	    i;

	if (this.fnc) {

		keys = conduit.paramsConfig.keys;
		paramArgs = new Array(keys.length);

		for (i = 0; i < keys.length; i++) {
			paramArgs[i] = conduit.params[keys[i].name];
		}

		switch (keys.length) {
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
 * Call a controller action as handler.
 * This gets called by `callHandler`.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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