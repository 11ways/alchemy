var pathToRegexp = alchemy.use('path-to-regexp');

/**
 * Route Class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
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
 * @since    0.2.0
 * @version  0.2.0
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
 * @since    0.2.0
 * @version  0.2.0
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
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setHandler(fnc) {

	var split;

	if (typeof fnc === 'function') {
		this.fnc = fnc;
		return;
	}

	if (typeof fnc === 'string') {
		split = fnc.split('#');

		this.controller = split[0];
		this.action = split[1];
		this.fnc = this.callController;
	}
});

/**
 * Call the handler for this route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
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
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function callController(conduit) {

	var instance,
	    args,
	    i;

	args = new Array(arguments.length);

	for (i = 0; i < args.length; i++) {
		args[i] = arguments[i];
	}

	if (this.controller) {
		instance = Controller.get(this.controller);

		switch (args.length) {
			case 1:
				return instance[this.action](args[0]);

			case 2:
				return instance[this.action](args[0], args[1]);

			case 3:
				return instance[this.action](args[0], args[1], args[2]);

			case 4:
				return instance[this.action](args[0], args[1], args[2], args[3]);

			default:
				return instance[this.action].apply(instance, args);
		}
	}

	throw new Error('No valid controller was set');
});