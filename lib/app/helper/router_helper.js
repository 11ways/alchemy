/**
 * The router helper
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {Renderer}    renderer
 */
var Router = Function.inherits('Alchemy.Helper', function Router(renderer) {
	Router.super.call(this, renderer);
});

/**
 * Also make it available under the Route name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Renderer}    renderer
 */
var Route = Function.inherits('Alchemy.Helper.Router', function Route(renderer) {
	Route.super.call(this, renderer);
});

/**
 * Get the current url we're on
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {RURL}
 */
Router.setProperty(function current_url() {
	if (this.view && this.view.variables && this.view.variables.__url) {
		return this.view.variables.__url.clone();
	}
});

/**
 * Apply directive to an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Element}   element    The element to apply to
 * @param    {String}    name       The route name
 * @param    {Object}    options
 *
 * @return   {Object}
 */
Router.setMethod(function applyDirective(element, name, options) {

	var config = this.routeConfig(name);

	if (!config) {
		this.markElementError(element, 'Route "' + name + '" not found');
		return;
	}

	let attribute_name,
	    param_source,
	    params,
	    url;

	if (element.parameters) {
		param_source = element.parameters;
	}

	if (config.keys && config.keys.length) {

		let key,
		    val,
		    i;

		params = {};

		for (i = 0; i < config.keys.length; i++) {
			key = config.keys[i];

			if (param_source && param_source[key] != null) {
				val = param_source[key];
			} else {
				if ((val = element['route_' + key]) == null) {
					val = element[key];
				}
			}

			if (val != null) {
				params[key] = val;
			}
		}
	}

	if (config.breadcrumb) {
		element.setAttribute('data-breadcrumb', this.getTrail(name, params));
	}

	url = this.routeUrl(name, params, {config: config});

	if (element.role == 'link') {
		attribute_name = 'href';
	} else {

		switch (element.nodeName) {
			case 'FORM':
				attribute_name = 'action';
				break;

			case 'AREA':
			case 'BASE':
			case 'LINK':
			case 'A':
				attribute_name = 'href';
				break;

			case 'IFRAME':
			case 'SCRIPT':
			case 'SOURCE':
			case 'FRAME':
			case 'TRACK':
			case 'IMG':
				attribute_name = 'src';
				break;

			default:
				attribute_name = 'src';
				break;
		}

		if (element.url_attribute) {
			attribute_name = element.url_attribute;
		}
	}

	element.setAttribute(attribute_name, url);
});

/**
 * Return route name info
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String}   name
 * @param    {Boolean}  socket_route   Look in the socket routes
 *
 * @return   {Object}
 */
Router.setMethod(function routeConfig(name, socket_route) {

	var section,
	    pieces,
	    routes,
	    result,
	    route,
	    name,
	    key;

	if (socket_route) {

		if (this.view) {
			routes = this.view.expose('socket_routes');
		}

		if (!routes && Blast.isNode) {
			routes = global.Router.getSocketRoutes();
		}
	} else {

		if (this.view) {
			routes = this.view.expose('routes');
		}

		if (!routes && Blast.isNode) {
			routes = global.Router.getRoutes();
		}
	}

	pieces = name.split('@');

	if (pieces.length == 1) {
		name = pieces[0];

		// Always look in the default section first
		if (routes.default[name] != null) {
			section = 'default';
		} else {
			for (key in routes) {
				if (routes[key][name] != null) {
					section = key
				}
			}
		}
	} else {
		section = pieces[0];
		name = pieces[1];
	}

	if (routes[section] != null && routes[section][name] != null) {
		route = routes[section][name];

		result = {
			section : section,
			name    : name
		};

		if (socket_route) {
			result.socket_route = true;
		} else {
			result.socket_route = false;
			result.paths = route.paths;
			result.breadcrumb = route.breadcrumb;
			result.has_breadcrumb_assignments = route.has_breadcrumb_assignments;
			result.keys = route.keys;
		}

		let router_options;

		if (this.view) {
			router_options = this.view.expose('router_options');
		}

		if (!router_options && Blast.isNode) {
			router_options = global.Router.getOptions();
		}

		if (router_options && router_options[result.section]) {
			result.router_options = router_options[result.section];
		}

		return result;
	}

	return null;
});

/**
 * Return the plain url for the given url name & parameters object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {String}   name
 * @param    {Object}   parameters
 */
Router.setMethod(function routeUrl(name, _parameters, options) {

	var parameters,
	    base_url,
	    locales,
	    config,
	    url,
	    key,
	    i;

	if (!options) {
		options = {};
	}

	url = '';
	config = options.config || this.routeConfig(name);
	parameters = Blast.Bound.Object.assign({}, _parameters);

	if (options.locale) {
		locales = [options.locale];
	} else if (options.locales) {
		locales = options.locales;
	} else if (this.view) {
		locales = this.view.expose('locales') || [];
	} else {
		locales = [];
	}

	if (config != null) {
		for (i = 0; i < locales.length; i++) {
			if (config.paths && config.paths[locales[i]]) {
				url = '/' + locales[i] + config.paths[locales[i]];
				break;
			}
		}

		if (!url && config.paths && config.paths['']) {
			url = config.paths[''];
		}

		if (!url && config.paths) {
			key = Object.keys(config.paths).first();

			if (key) {
				url = '/' + key + config.paths[key];
			}
		}

		if (!url) {
			return '#url_config_' + name + '_notfound';
		}

		// Remove [brackets]
		url = url.replace(/\[.*?\]/g, '');
		url = url.assign(parameters, true, RURL.encodeUriQuery);
	}

	url = this.parseURL(url);

	if (config != null) {
		// Do any GET parameters need to be copied over?
		if (config.router_options && Array.isArray(config.router_options.keep_get_parameters)) {
			let current_url = this.current_url;

			if (current_url) {
				let name,
				    i;

				for (i = 0; i < config.router_options.keep_get_parameters.length; i++) {
					name = config.router_options.keep_get_parameters[i];

					if (current_url.param(name) != null) {
						url.param(name, current_url.param(name));
					}
				}
			}
		}
	}

	if (options.get) {
		url.addQuery(options.get);
	}

	// Add non-used parameters as GET
	if (!Object.isEmpty(parameters) && options.extra_get_parameters !== false) {
		url.addQuery(parameters);
	}

	if (options.hash) {
		url.hash = options.hash;
	}

	if (options.full || options.absolute) {
		base_url = this.view.internal('url') || RURL.parse(window.location);
		url.protocol = base_url.protocol;
		url.host = base_url.host;
		url.hostname = base_url.hostname;
		url.port = base_url.port;
	}

	return url;
});

/**
 * Get a route's trail
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   name
 * @param    {Object}   parameters
 *
 * @return   {String}
 */
Router.setMethod(function getTrail(name, parameters) {

	var breadcrumb,
	    config;

	config = this.routeConfig(name);

	if (!config || !config.breadcrumb) {
		return;
	}

	breadcrumb = config.breadcrumb;

	if (config.has_breadcrumb_assignments) {
		breadcrumb = Blast.Bound.String.assign(breadcrumb, parameters).toLowerCase();
	}

	return breadcrumb;
});

/**
 * Print a breadcrumb trail
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Router.setMethod(function printBreadcrumb() {

	var that = this;

	this.view.print_partial('breadcrumb/wrapper');
});

/**
 * Set breadcrumb info, if it hasn't happened yet during this render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Array}   entries
 */
Router.setMethod(function setBreadcrumb(entries) {

	if (this.view.internal('breadcrumb_entries')) {
		return;
	}

	this.view.internal('breadcrumb_entries', entries);
});

/**
 * Print out an anchor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String}   name
 * @param    {Object}   parameters
 */
Router.setMethod(function printRoute(name, parameters, options) {

	var anchor = this.getAnchor(name, parameters, options);

	this.open_route = anchor;

	this.renderer.current_block.pushElement(anchor);
	this.renderer.closeElement();
});

/**
 * Close the current open route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 */
Router.setMethod(function closeRoute() {

	if (this.open_route) {
		Hawkejs.removeChildren(this.open_route);
		Hawkejs.claimSiblings(this.open_route);
		this.open_route = null;
	}

});

/**
 * Return the route anchor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @param    {String}   name
 * @param    {Object}   parameters
 */
Router.setMethod(function getAnchor(name, parameters, options) {

	var config,
	    anchor,
	    pieces,
	    inner,
	    name,
	    url,
	    i;

	url = '';
	config = this.routeConfig(name);

	if (options == null) {
		options = {};
	}

	if (config != null) {
		// Get the url, remove any types
		url = this.routeUrl(name, parameters, options);

		// Create the anchor
		anchor = this.createElement('a'); 
		anchor.setAttribute('href', url);

		if (options.handleManual) {
			anchor.classList.remove('js-he-link');
		}

		if (config.breadcrumb) {
			anchor.setAttribute('data-breadcrumb', this.getTrail(name, parameters));
		}

		if (options.className) {
			pieces = options.className.split(' ');

			for (i = 0; i < pieces.length; i++) {

				// Make sure to not add empty strings,
				// that'll throw an error in the brower
				if (pieces[i]) {
					anchor.classList.add(pieces[i]);
				}
			}
		}

		if (options.innerWrap) {
			inner = this.view.createElement(options.innerWrap);
			anchor.innerHTML = '';
			anchor.appendChild(inner);
		} else {
			inner = anchor;
		}

		inner.innerHTML = options.content || options.title || config.name;

		if (options.title){
			anchor.setAttribute('title', Hawkejs.getSafeText(options.title));
		}

		if (options.divert) {
			anchor.setAttribute('data-divert', options.divert);
		}

		if (options.history === false) {
			anchor.setAttribute('data-history', false);
		}

		for (name in options.attributes) {
			anchor.setAttribute(name, options.attributes[name]);
		}

		return anchor;
	}

	anchor = this.renderer.createElement('a');
	anchor.setAttribute('href', '#');

	return anchor;
});

/**
 * The switch language element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.1
 * @version  1.1.0
 */
Router.setMethod(function languageSwitcher(options) {

	var prefixes = this.view.expose('prefixes'),
	    prefix,
	    config,
	    locale;

	if (this.view.expose('locales')) {
		locale = this.view.expose('locales')[0];
	}

	let select = this.createElement('select');
	select.classList.add('language-switcher');

	if (options && options.className) {
		Hawkejs.addClasses(select, options.className);
	}

	select.setAttribute('onchange', 'alchemy.switchLanguage(this)');

	for (prefix in prefixes) {
		config = prefixes[prefix];

		let option = this.createElement('option');
		option.setAttribute('value', prefix);

		select.append(option);

		if (prefix == locale) {
			option.setAttribute('selected', 'selected');
		}

		option.append(config.title || this.view.__('language.' + prefix).toElement());
	}

	this.print(select);
});