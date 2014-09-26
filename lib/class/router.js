var Url = require('url'),
    prefixes = alchemy.shared('Routing.prefixes'),
    Router;

/**
 * The Router Singleton
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var RouterClass = Informer.extend(function Router(name, mount, parent) {

	// Call the Informer constructor
	Router.super.call(this);

	// The name of the router
	this.name = name;

	// The mount point of this router
	this.mount = mount;

	// The parent
	this.parent = parent || null;

	// Sub sections
	this.subSections = {};

	// The header bypass
	this.bypass = null;

	// Routes inside this router
	this.routes = new Deck();
});

/**
 * Get and/or create a section
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function section(name, mount) {

	// The default section is not stored in any object
	if (name == 'default') {
		return Router;
	}

	// Create the section if it doesn't exist yet
	if (typeof this.subSections[name] === 'undefined') {

		if (!mount) {
			mount = '/' + name;
		}

		this.subSections[name] = new RouterClass(name, mount, this);
	}

	return this.subSections[name];
});

/**
 * Capture vhost requests in the header with the given prefix
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function headerBypass(prefix) {
	this.bypass = prefix;
});

/**
 * Get the prefix (locale)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function getPrefix(path) {

	var prefix,
	    begin;

	// See if the path starts with any set prefix
	for (key in prefixes) {
		begin = '/' + key + '/';

		if (path.indexOf(begin) === 0) {
			return {
				prefix: key,
				path: path.slice(begin.length-1)
			};
		}
	}

});

/**
 * Get the section of the path
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   path   The path without prefix
 */
RouterClass.setMethod(function getPathSection(path) {

	var name,
	    temp;

	// First do the children (because the root section is just "/")
	for (name in this.subSections) {
		temp = this.subSections[name].getPathSection(path);

		if (temp) {
			return temp;
		}
	}

	if (path.indexOf(this.mount) === 0) {
		return this;
	}
});

/**
 * Get a route based on information inside the request
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Router}   section
 * @param    {String}   path     The path without prefix
 * @param    {String}   prefix
 */
RouterClass.setMethod(function getRouteBySectionPath(section, path, prefix) {

	var routes,
	    params,
	    route,
	    temp,
	    key,
	    i;

	routes = section.routes.getSorted();

	for (i = 0; i < routes.length; i++) {
		route = routes[i];

		if (route.isMiddleware) {
			continue;
		}

		params = route.match(path, prefix);

		if (params) {
			return {
				route: route,
				params: params
			};
		}
	}
});

/**
 * Return the route by the requested name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name   The name of the route to get
 *
 * @result   {Route}           The Route instance, or false
 */
RouterClass.setMethod(function getRouteByName(name) {

	var route,
	    key;

	route = this.routes.get(name);

	if (route) {
		return route;
	}

	for (key in this.subSections) {
		route = this.subSections[key].getRouteByName(name);

		if (route) {
			return route;
		}
	}

	return false;
});

/**
 * Get middleware routes
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Router}   section
 * @param    {String}   path
 * @param    {String}   prefix
 *
 * @return   {Array}
 */
RouterClass.setMethod(function getMiddleware(section, path, prefix) {

	var result,
	    routes,
	    route,
	    src,
	    i;

	result = [];

	// @todo: sub section middleware will happen before parent middleware!
	while (section) {
		routes = section.routes.getSorted();

		for (i = 0; i < routes.length; i++) {
			route = routes[i];

			if (route.isMiddleware) {

				if (route.paths['']) {
					src = route.paths[''].source;
				}

				if (path.startsWith(src) || route.match(path, prefix)) {
					result.push(route);
				}
			} else {
				// If this non-middleware route matches
				// don't look for more middleware in this section
				if (route.match(path, prefix)) {
					break;
				}
			}
		}

		// This child is done, go to the parent
		section = section.parent;
	}

	return result;
});

/**
 * Resolve a request
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function resolve(req, res) {

	var c = new Conduit(req, res);

	// console.log(c);
	// console.log(req.headers);
	
});

/**
 * Add middleware
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}     paths     Optional path
 * @param    {Function}   fnc       The actual middleware function
 * @param    {Object}     options
 */
RouterClass.setMethod(function use(_paths, _fnc, _options) {

	var options,
	    weight,
	    route,
	    name,
	    paths,
	    fnc;

	if (typeof _paths === 'function') {
		paths = '/';
		fnc = _paths;
		options = _fnc;
	} else {
		paths = _paths;
		fnc = _fnc;
		options = _options;
	}

	if (typeof options === 'number') {
		weight = options;
		options = undefined;
	}

	if (typeof options === 'undefined') {
		options = {};
	}

	if (typeof weight !== 'number') {
		weight = options.weight || 20;
	}

	if (options.name) {
		name = options.name;
	} else {

		if (fnc && fnc.name) {
			name = fnc.name;
		} else {
			name = 'middleware-' + Date.now() + '-' + Number.random();
		}
	}

	route = new alchemy.classes.Route(this, paths, options);

	route.isMiddleware = true;
	route.weight = weight;
	route.name = name;
	route.methods = ['get', 'post', 'put', 'delete'];

	route.setHandler(fnc);

	this.routes.set(name, route, weight);
});


/**
 * Add a route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Array}          methods   The methods to listen to (all)
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function add(_methods, _name, _paths, _fnc, _options) {

	var options,
	    methods,
	    weight,
	    route,
	    paths,
	    name,
	    fnc;

	if (!Array.isArray(_methods)) {
		options = _fnc;
		fnc = _paths;
		paths = _name;
		name = _methods;
		methods = ['get', 'post', 'put', 'delete'];
	} else {
		methods = _methods;
		name = _name;
		paths = _paths;
		fnc = _fnc;
		options = _options;
	}

	if (typeof paths === 'function') {
		options = fnc;
		fnc = paths;
		paths = undefined;
	}

	if (typeof paths === 'undefined') {
		paths = name;
		name = 'nameless-' + Date.now();
	}

	if (typeof fnc === 'object' && fnc) {
		options = fnc;
		fnc = undefined;
	}

	if (typeof options === 'undefined') {
		options = {};
	} else if (typeof options === 'number') {
		weight = options;
		options = {};
	}

	if (typeof weight !== 'number') {
		weight = 10;
	}

	route = new alchemy.classes.Route(this, paths, options);

	route.weight = weight;
	route.name = name;
	route.methods = methods;

	route.setHandler(fnc);

	this.routes.set(name, route, weight);
});

/**
 * Add a get route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function get(name, paths, fnc, options) {
	return this.add(['get'], name, paths, fnc, options);
});

/**
 * Add a post route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function post(name, paths, fnc, options) {
	return this.add(['post'], name, paths, fnc, options);
});

/**
 * Add a put route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function put(name, paths, fnc, options) {
	return this.add(['put'], name, paths, fnc, options);
});

/**
 * Add a delete route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod('delete', function _delete(name, paths, fnc, options) {
	return this.add(['delete'], name, paths, fnc, options);
});

// Store the class
alchemy.classes.Router = RouterClass;

// Create the main, default Router instance
Router = new RouterClass('default', '/');

// Augment it
Router = Object.create(Router);

// Indicate that this is actually the main router, so it behaves different
Router.main = true;

// Turn it into a global
global.Router = Router;