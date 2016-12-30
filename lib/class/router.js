var Url = alchemy.use('url'),
    prefixes = alchemy.shared('Routing.prefixes'),
    allroutes = alchemy.shared('Routing.routes'),
    allsections = alchemy.shared('Routing.sections'),
    name_count = 0,
    Router;

/**
 * The Router Singleton
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 */
var RouterClass = Function.inherits('Alchemy.Base', function Router(name, mount, parent) {

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

	// Socket types
	this.socketTypes = {};

	// Socket routes
	this.socketRoutes = {};

	// Linkup routes
	this.linkupRoutes = {};

	// Breadcrumb information
	this.breadcrumb_info = {};

	// The header bypass
	this.bypass = null;

	// Routes inside this router
	this.routes = new Deck();

	this.generateSectionIdentifier();
});

/**
 * Default route settings
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
RouterClass.setProperty('default_route_settings', {
	method : 'get',
	weight : 10
});

/**
 * Get the complete section identifier
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.3
 * @version  0.3.3
 */
RouterClass.setMethod(function generateSectionIdentifier() {

	var identifier,
	    title;

	identifier = this.name;
	title = this.name.titleize();

	if (this.parent && this.parent.name !== 'default') {
		identifier = this.parent.section_identifier + ':' + identifier;
		title = this.parent.title + ':' + title;
	}

	this.section_identifier = identifier;
	this.title = title;

	// Register this section
	allsections[this.section_identifier] = this;
});

/**
 * Get and/or create a section
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function headerBypass(prefix) {
	this.bypass = prefix;
});

/**
 * Get the full mount path of this router
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
RouterClass.setMethod(function getFullMount() {

	var result = this.mount,
	    parent_mount;

	if (this.parent) {
		parent_mount = this.parent.getFullMount();

		if (parent_mount && parent_mount.length > 1) {
			result = parent_mount + result;
		}
	}

	return result;
});

/**
 * Get the prefix (locale)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * Get a route by breadcrumb pattern
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   breadcrumb_pattern
 *
 * @return   {Alchemy.Route}
 */
RouterClass.setMethod(function getRouteByBreadcrumb(breadcrumb_pattern) {

	var routes,
	    route,
	    key,
	    i;

	routes = this.routes.getSorted();

	for (i = 0; i < routes.length; i++) {
		route = routes[i];

		if (route.breadcrumb == breadcrumb_pattern) {
			return route;
		}
	}

	// If it hasn't been found yet, search through the subsections
	for (key in this.subSections) {
		route = this.subSections[key].getRouteByBreadcrumb(breadcrumb_pattern);

		if (route) {
			return route;
		}
	}
});

/**
 * Get breadcrumb info by pattern
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   breadcrumb_pattern
 *
 * @return   {Object}
 */
RouterClass.setMethod(function lookupBreadcrumbPath(breadcrumb_pattern) {

	var result,
	    key;

	result = Object.path(this.breadcrumb_info, breadcrumb_pattern);

	if (result) {
		return result;
	}

	// If it hasn't been found yet, search through the subsections
	for (key in this.subSections) {
		result = this.subSections[key].lookupBreadcrumbPath(breadcrumb_pattern);

		if (result) {
			return result;
		}
	}
});

/**
 * Get a route based on information inside the request
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   method
 * @param    {Router}   section
 * @param    {String}   path        The path without prefix
 * @param    {String}   prefix
 * @param    {Route}    last_match  If this is a rematch, skip everything before this
 */
RouterClass.setMethod(function getRouteBySectionPath(method, section, path, prefix, last_match) {

	var passed_last_match,
	    routes,
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

		// If we've been given a last match, and haven't seen it yet, skip
		if (last_match && !passed_last_match) {

			// If this route matches the last matched route, indicate so
			if (last_match == route) {
				passed_last_match = true;
			}

			continue;
		}

		temp = route.match(method, path, prefix);

		if (temp) {
			return {
				route: route,
				params: temp.params,
				paramsConfig: temp.paramsConfig
			};
		}
	}
});

/**
 * Return the route by the requested name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {String}   name   The name of the route to get
 *
 * @result   {Route}           The Route instance, or false
 */
RouterClass.setMethod(function getRouteByName(name) {

	var section,
	    route,
	    key;

	route = this.routes.get(name);

	if (route) {
		return route;
	}

	// If a subsection is set in the name, look there
	if (name.indexOf('@') > -1) {
		section = name.before('@');
		name = name.after('@');

		if (this.subSections[section]) {
			return this.subSections[section].getRouteByName(name);
		}
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Router}   section
 * @param    {String}   path        The full requested path
 * @param    {String}   prefix
 *
 * @return   {Array}
 */
RouterClass.setMethod(function getMiddleware(section, path, prefix) {

	var sectionPath,
	    result,
	    routes,
	    route,
	    src,
	    i;

	result = [];

	// @todo: sub section middleware will happen before parent middleware!
	while (section) {

		sectionPath = path;

		if (section.mount && section.mount.length > 1 && sectionPath.indexOf(section.mount) == 0) {
			sectionPath = sectionPath.slice(section.mount.length);
			if (!sectionPath) {
				sectionPath = '/';
			}
		}

		routes = section.routes.getSorted();

		for (i = 0; i < routes.length; i++) {
			route = routes[i];

			if (route.isMiddleware) {

				if (route.paths['']) {
					src = route.paths[''].source;
				}

				if (sectionPath.startsWith(src) || route.match(sectionPath, prefix)) {
					result.push(route);
				}
			} else {
				// If this non-middleware route matches
				// don't look for more middleware in this section
				if (route.match(sectionPath, prefix)) {
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function resolve(req, res) {
	var c = new Classes.Alchemy.HttpConduit(req, res);
});

/**
 * Resolve a request inside an electron app
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function resolveElectron(request, callback) {
	var c = new Classes.Alchemy.ElectronConduit(request, callback);
});

/**
 * Add breadcrumb information
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
RouterClass.setMethod(function addBreadcrumb(pattern, options) {

	var entry;

	if (!options) {
		options = {};
	}

	// Try getting the entry first
	entry = Object.path(this.breadcrumb_info, pattern);

	if (!entry) {
		entry = {};
		Object.setPath(this.breadcrumb_info, pattern, entry);
	}

	if (!entry._options) {
		entry._options = {};
	}

	if (typeof options.route == 'string') {
		options.route = Router.getRouteByName(options.route);
	}

	Object.assign(entry._options, options);
});

/**
 * Add middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
		options = _fnc;
		fnc = _paths;
		paths = '/';
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
			name = fnc.name + '-' + (name_count++);
		} else {
			name = 'middleware-' + Date.now() + '-' + Number.random();
		}
	}

	route = new Classes.Alchemy.Route(this, paths, options);

	route.isMiddleware = true;
	route.weight = weight;
	route.name = name;

	if (options.methods) {
		route.methods = options.methods.slice(0);
	} else {
		route.methods = ['get', 'post', 'put', 'delete'];
	}

	route.setHandler(fnc);

	this.routes.set(name, route, weight);
});

/**
 * Add a route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {Object}   args
 * @param    {String}   args.name            Optional route name
 * @param    {Array}    args.methods         Supported HTTP methods
 * @param    {Number}   args.weight          Importance of this route
 * @param    {Object}   args.options         Extra options
 * @param    {String}   args.breadcrumb      String used for breadcrumb
 * @param    {String|Function} args.handler  Route handler
 * @param    {String|Object}   args.paths    The paths of this route
 */
RouterClass.setMethod(function add(args) {

	var breadcrumb_options,
	    route;

	// Handle old-style adds
	if (arguments.length > 1 || Array.isArray(args)) {
		return this._add.apply(this, arguments);
	}

	// Apply to the default route settings
	args = Object.assign({}, this.default_route_settings, args);

	// Ensure certain types
	if (typeof args.weight !== 'number') {
		args.weight = 10;
	}

	// Ensure the route has a name
	if (!args.name) {
		args.name = 'nameless-' + (name_count++);
	}

	// Ensure there is an options object
	if (!args.options) {
		args.options = {};
	}

	// Make sure methods is an array
	args.methods = Array.cast(args.methods);

	// Create the new route
	route = new Classes.Alchemy.Route(this, args.paths, args.options);

	route.weight = args.weight;
	route.name = args.name;
	route.methods = args.methods;
	route.setBreadcrumb(args.breadcrumb);

	if (args.breadcrumb) {
		breadcrumb_options = {
			route : route
		};

		if (args.name) {
			breadcrumb_options.name = args.name;
		}

		if (args.title) {
			breadcrumb_options.title = args.title;
		}

		if (args.breadcrumb_link) {
			breadcrumb_options.link_fnc = args.breadcrumb_link;
		}

		this.addBreadcrumb(args.breadcrumb, breadcrumb_options);
	}

	route.setHandler(args.handler || args.name);

	this.routes.set(args.name, route, args.weight);

	if (args.methods.indexOf('get') > -1) {
		allroutes[this.name + '::' + args.name] = '' + this.name + ' - ' + args.name;
	}

	return route;
});

/**
 * Add a route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {Array}          methods   The methods to listen to (all)
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function _add(_methods, _name, _paths, _fnc, _options) {

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
		name = 'nameless-' + (name_count++);
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

	return this.add({
		name     : name,
		paths    : paths,
		methods  : methods,
		handler  : fnc,
		options  : options,
		weight   : weight
	});
});

/**
 * Add a get route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function get(name, paths, fnc, options) {
	return this._add(['get'], name, paths, fnc, options);
});

/**
 * Add a post route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function post(name, paths, fnc, options) {
	return this._add(['post'], name, paths, fnc, options);
});

/**
 * Add a put route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String|Object}  paths     Path to listen to
 * @param    {Function}       fnc       Optional function to handle route
 * @param    {Object}         options
 */
RouterClass.setMethod(function put(name, paths, fnc, options) {
	return this._add(['put'], name, paths, fnc, options);
});

/**
 * Add a socket route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name       The name of the socket event
 * @param    {Function}       action     The action, as a string or function
 */
RouterClass.setMethod(function socket(name, action) {

	var route;

	// Add this socket event as a route
	route = this.add(['socket'], name, null, action);

	// Save it in the socket routes object too
	this.socketRoutes[name] = route;

	return route;
});

/**
 * Add a socket linkup route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}         name      The name of the path (timestamp)
 * @param    {String}         type      The message type (name)
 * @param    {Function}       fnc       Optional function to handle route
 */
RouterClass.setMethod(function linkup(name, eventname, fnc) {
	this.linkupRoutes[eventname] = fnc;
});

/**
 * Add a delete route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

/**
 * Get an object of all the routes in this router and its children
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
RouterClass.setMethod(function getFullMount() {

	var result = this.mount;

	if (this.parent != null && this.parent.mount != '/') {
		result = this.parent.mount + result;
	}

	if (result[result.length-1] == '/') {
		result = result.slice(0, -1);
	}

	return result;
});

/**
 * Get an object of all the routes in this router and its children
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   result   Optional object to store sectioned results in
 *
 * @return   {Object}   The `result` object
 */
RouterClass.setMethod(function getRoutes(result) {

	var section,
	    routes,
	    prefix,
	    route,
	    mount,
	    temp,
	    key,
	    i;

	section = {};
	routes = this.routes.getSorted(false);
	mount = this.getFullMount();

	for (i = 0; i < routes.length; i++) {
		route = routes[i];

		if (route.isMiddleware) {
			continue;
		}

		temp = {};

		for (prefix in route.paths) {
			temp[prefix] = mount + route.paths[prefix].source;
		}

		section[route.name] = {
			paths                      : temp,
			breadcrumb                 : route.breadcrumb,
			has_breadcrumb_assignments : route.has_breadcrumb_assignments
		};
	}

	if (result == null) {
		result = {};
	}

	// Get the routes of all the sub sections
	for (key in this.subSections) {
		this.subSections[key].getRoutes(result);
	}

	result[this.name] = section;

	return result;
});

/**
 * Get an object of all the socket routes in this router and its children
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   result   Optional object to store sectioned results in
 *
 * @return   {Object}   The `result` object
 */
RouterClass.setMethod(function getSocketRoutes(result) {

	var section,
	    routes,
	    prefix,
	    route,
	    mount,
	    temp,
	    key,
	    i;

	section = {};
	routes = this.socketRoutes;

	// Store all the routes of this section
	for (key in routes) {
		section[key] = key;
	}

	// Create a new result object if it does not exist yet
	if (result == null) {
		result = {};
	}

	// Get the routes of all the sub sections
	for (key in this.subSections) {
		this.subSections[key].getSocketRoutes(result);
	}

	// Store the result of this section under its name
	result[this.name] = section;

	return result;
});

/**
 * Get an object of all the breadcrumbs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Object}   result   Optional object to store sectioned results in
 *
 * @return   {Object}   The `result` object
 */
RouterClass.setMethod(function getBreadcrumbInfo(result) {

	var key;

	if (result == null) {
		result = {};
	}

	// Get the routes of all the sub sections
	for (key in this.subSections) {
		this.subSections[key].getBreadcrumbInfo(result);
	}

	result[this.name] = this.breadcrumb_info;

	return result;
});

// Create the main, default Router instance
Router = new RouterClass('default', '/');

// Augment it
Router = Object.create(Router);

// Indicate that this is actually the main router, so it behaves different
Router.main = true;

// Turn it into a global
global.Router = Router;

/**
 * Expose the routes to the client when the scene is being constructed
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 */
alchemy.hawkejs.on({type: 'viewrender', status: 'begin', client: false}, function onBegin(viewRender) {

	// Expose basic HTTP routes
	viewRender.expose('routes', Router.getRoutes());

	// Expose socket routes
	viewRender.expose('socket_routes', Router.getSocketRoutes());

	// Expose breadcrumb info
	viewRender.expose('breadcrumb_info', Router.getBreadcrumbInfo());

	// Expose prefixes
	viewRender.expose('prefixes', Prefix.all());
});