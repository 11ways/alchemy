/**
 * The router helper
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @type     {RURL}
 */
Router.setProperty(function current_url() {

	let renderer = this.view_render;

	if (renderer?.variables) {
		try {
			let url = renderer.variables.get('__url');
			if (url) {
				return url.clone();
			}
		} catch (err) {
			// Ignore
		}
	}
	
	if (Blast.isBrowser) {

		if (hawkejs?.scene?.opening_url?.url) {
			return Blast.Classes.RURL.parse(hawkejs.scene.opening_url.url);
		}

		return Blast.Classes.RURL.parse(window.location);
	}
});

/**
 * Get the current riyte we're on
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 *
 * @type     {Object}
 */
Router.setProperty(function current_route() {

	const variables = this.view_render?.variables;

	if (!variables) {
		return;
	}

	let route_name = variables.get('__route');

	if (!route_name) {
		return;
	}

	if (!this._all_routes) {
		this._all_routes = alchemy.getRoutes();
	}

	return this._all_routes.get(route_name);
});

/**
 * Check if the given URL is a local one
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.4.0
 *
 * @param    {string|RURL}    url
 *
 * @return   {boolean}
 */
Router.setMethod(function isLocalUrl(url) {

	url = RURL.parse(url);

	if (!url.hostname) {
		return true;
	}

	if (Blast.isNode && alchemy.settings.network.main_url) {
		// @TODO: Would be nice to not have to parse this every time
		let server_url = RURL.parse(alchemy.settings.network.main_url);

		if (server_url.hostname == url.hostname) {
			return true;
		}
	}

	let current_url = this.current_url;

	if (current_url && current_url.hostname == url.hostname) {
		return true;
	}

	return false;
});

/**
 * Apply directive to an element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Element}   element    The element to apply to
 * @param    {string}    name       The route name
 * @param    {Object}    options
 *
 * @return   {Object}
 */
Router.setMethod(function applyDirective(element, name, options) {

	let config = this.routeConfig(name);

	if (!config) {
		this.markElementError(element, 'Route "' + name + '" not found');
		return;
	}

	let disable_ajax = false,
	    attribute_name,
	    params = {},
	    url;

	if (element.parameters && typeof element.parameters == 'object') {
		Object.assign(params, element.parameters);
	}

	if (options.parameters) {
		Object.assign(params, options.parameters);
	}

	if (config.keys && config.keys.length) {

		let key,
		    val;

		for (key of config.keys) {

			if (params[key] == null) {

				val = element['route_' + key];

				if (val == null) {
					let variables = element[Hawkejs.VARIABLES];

					if (variables) {
						val = variables.get(key);
					}
				}

				if (val == null) {
					val = element[key];
				}

				if (val != null) {
					params[key] = val;
				}
			}
		}
	}

	let breadcrumb = config.breadcrumb;

	if (options.breadcrumb) {
		if (!breadcrumb) {
			breadcrumb = options.breadcrumb;
		} else {
			breadcrumb += ' ' + options.breadcrumb;
		}
	}

	if (config.breadcrumb || options.breadcrumb) {
		let link_breadcrumb = this.getTrail(name, {...params}, options);
		element.setAttribute('data-breadcrumb', link_breadcrumb);

		if (this.renderer && link_breadcrumb) {
			let page_breadcrumb = new Classes.Alchemy.Breadcrumb(this.renderer.internal('breadcrumb'));

			if (page_breadcrumb.matches(link_breadcrumb)) {

				if (element.parentElement) {
					// @TODO: We need to make sure the options (classnames & such)
					// are set on the parent. Could this be handled elsewhere?
					this.renderer.ensureElementOptions(element.parentElement);
				}

				let level = 2;

				if (page_breadcrumb == link_breadcrumb) {
					level = 1;
				}

				alchemy.markLinkElement(element, level);
			}
		}
	}

	url = this.routeUrl(name, params, {config: config});

	if (url._chosen_prefix) {
		// @TODO: A prefix isn't necesarily a language!
		element.setAttribute('hreflang', url._chosen_prefix);
	}

	if (config && this.renderer.variables.get('__route')) {
		let route = this.current_route;

		if (route && route.section != config.section) {
			disable_ajax = true;
		}
	} else if (config.section != 'default') {
		disable_ajax = true;
	}

	let method_attribute = false;

	if (element.role == 'link') {
		attribute_name = 'href';
	} else {

		switch (element.nodeName) {
			case 'FORM':
				attribute_name = 'action';
				method_attribute = 'method'; 
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

	if (method_attribute && config.methods?.[0]) {
		let existing_method = element.getAttribute(method_attribute);

		// Assume the user knows what they're doing when there is an existing method
		if (!existing_method) {
			let found_method = false;

			// There is no method, look for the best one (we prefer a post)
			for (let method of config.methods) {
				method = method.toLowerCase();

				if (method == 'post' || method == 'put') {
					element.setAttribute(method_attribute, method);
					found_method = true;
					break;
				}
			}

			if (!found_method) {
				element.setAttribute(method_attribute, config.methods[0]);
			}
		}
	}

	if (disable_ajax) {
		element.setAttribute('data-he-link', 'false');
	}

	element.setAttribute(attribute_name, url);
});

/**
 * Return route name info
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.7
 *
 * @param    {string}   name
 * @param    {boolean}  socket_route   Look in the socket routes
 *
 * @return   {Object}
 */
Router.setMethod(function routeConfig(name, socket_route) {

	if (!name) {
		return null;
	}

	let section,
	    routes;

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

	if (!routes) {
		return null;
	}

	let pieces = name.split('@');

	if (pieces.length == 1) {
		name = pieces[0];

		// Always look in the default section first
		if (routes.default[name] != null) {
			section = 'default';
		} else {
			let key;

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
		let route = routes[section][name];

		let result;

		if (socket_route) {
			result = {
				section      : section,
				name         : name,
				socket_route : true,
			};
		} else {
			result = Object.create(route);
			result.socket_route = false;
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {string}   name
 * @param    {Object}   parameters
 *
 * @return   {RURL}
 */
Router.setMethod(function routeUrl(name, parameters, options) {

	if (!options) {
		options = {};
	}

	let locales,
	    config = options.config || this.routeConfig(name),
	    url = '';

	if (options.locale || options.prefix) {
		locales = [options.prefix || options.locale];
	} else if (options.locales) {
		locales = options.locales;
	} else if (this.view) {
		locales = this.view.expose('locales') || [];
	} else {
		locales = [];
	}

	if (parameters) {
		// Create a shallow clone of simple objects
		if (Object.isPlainObject(parameters)) {
			parameters = {...parameters};
		} else {
			// Create an overlay instead of a clone
			// (in case it's a special parameters object, like a Document)
			parameters = Object.create(parameters);
		}
	} else {
		parameters = {};
	}

	let chosen_prefix;

	if (config != null) {
		let i;

		for (i = 0; i < locales.length; i++) {
			if (config.paths && config.paths[locales[i]]) {
				chosen_prefix = locales[i];
				url = '/' + chosen_prefix + config.paths[chosen_prefix];
				break;
			}
		}

		if (!url && config.paths && config.paths['']) {
			url = config.paths[''];
		}

		if (!url && config.paths) {
			let key = Object.keys(config.paths).first();

			if (key) {
				url = '/' + key + config.paths[key];
			}
		}

		if (!url) {
			return '#url_config_' + name + '_notfound';
		}

		if (config.param_definitions) {

			let documents = {},
			    definition,
			    key;

			for (key in config.param_definitions) {
				definition = config.param_definitions[key];

				// If this definition has a specific model name,
				// try to get it from the parameters (and also remove it from there)
				if (definition.type_class_name) {
					if (!documents[definition.type_class_name]) {
						documents[definition.type_class_name] = parameters[definition.type_class_name];

						if (documents[definition.type_class_name]) {
							delete parameters[definition.type_class_name];
						}
					}
				}

				if (!parameters[definition.name] && documents[definition.type_class_name]) {
					parameters[definition.name] = documents[definition.type_class_name][definition.type_field_name];
				}
			}
		}

		// Remove [brackets]
		url = url.replace(/\[.*?\]/g, '');
		url = url.assign(parameters, true, RURL.encodeUriQuery);

		// Remove capturing regexes
		if (url.indexOf('(') > -1) {
			// @TODO: should exclude escaped colons like "\\("
			url = url.replace(/\(.*?\)/g, '');
		}
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

		let base_url;

		if (this.view) {
			base_url = this.view.internal('url');
		}

		if (!base_url) {
			if (Blast.isBrowser) {
				base_url = RURL.parse(window.location);
			} else {
				base_url = RURL.parse(alchemy.settings.network.main_url);
			}
		}

		if (base_url) {
			url.protocol = base_url.protocol;
			url.host = base_url.host;
			url.hostname = base_url.hostname;
			url.port = base_url.port;
		}
	}

	url._locales = locales;
	url._chosen_prefix = chosen_prefix;

	return url;
});

/**
 * Get a route's trail
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.3.8
 *
 * @param    {string}   name
 * @param    {Object}   parameters
 * @param    {Object}   options
 *
 * @return   {Alchemy.Breadcrumb}
 */
Router.setMethod(function getTrail(name, parameters, options) {

	let can_have_assignments,
	    trails = [],
	    config;
	
	if (options?.breadcrumb) {
		can_have_assignments = true;
		trails.push(options.breadcrumb);
	}

	config = this.routeConfig(name);

	if (!trails.length && (!config || !config.breadcrumb)) {
		return;
	}

	let breadcrumb = new Classes.Alchemy.Breadcrumb();

	if (config?.breadcrumb) {
		trails.push(config.breadcrumb);
	}

	if (!can_have_assignments) {
		can_have_assignments = config?.has_breadcrumb_assignments;
	}

	if (can_have_assignments) {
		let key;
		parameters = {...parameters};

		for (key in parameters) {
			if (key[0] == key[0].toUpperCase()) {
				let value = parameters[key];

				if (value && typeof value == 'object') {
					let subkey;

					let context = value?.$main || value;

					for (subkey in context) {
						if (parameters[subkey] == null) {
							parameters[subkey] = context[subkey];
						}
					}
				}
			}
		}
	}

	let trail;

	for (trail of trails) {
		if (can_have_assignments) {
			trail = Blast.Bound.String.assign(trail, parameters).toLowerCase();
		}

		breadcrumb.addTrail(trail);
	}

	return breadcrumb;
});

/**
 * Print a breadcrumb trail
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Router.setMethod(function printBreadcrumb() {
	this.view.print_partial('breadcrumb/wrapper');
});

/**
 * Set breadcrumb info, if it hasn't happened yet during this render
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {string}   name
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @param    {string}   name
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
 * Get the current route variables
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.4.0
 *
 * @return   {Object}
 */
Router.setMethod(function getRouteVariables() {

	const variables = this.view_render?.variables;

	let params,
	    route = variables?.get?.('__route'),
	    url;

	if (route) {
		params = variables.get('__urlparams');
		url = variables.get('__url');
	} else if (Blast.isBrowser) {
		route = alchemy.current_route;
		params = alchemy.current_url_params;
		url = alchemy.current_url;
	}

	return {route, params, url};
});

/**
 * Update language switcher info
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.3.0
 *
 * @param    {Element}   element    The element to apply to
 * @param    {Object}    variables
 */
Router.setMethod(function updateLanguageSwitcher(element, variables) {

	let language = element.getAttribute('data-alchemy-language-switch');

	if (!language) {
		return;
	}

	let url = this.translateCurrentRoute(language, variables);

	if (!url) {
		url = '/' + language;
	}

	element.setAttribute('href', url);
});

/**
 * Get a translated URL for the current route
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.3.8
 *
 * @param    {string}   prefix    The prefix to use
 * @param    {Object}   variables
 */
Router.setMethod(function translateCurrentRoute(prefix, variables) {

	let current_route_translations = variables?.__current_route_translations,
	    current_route_translation = current_route_translations?.[prefix] ?? null;
	
	if (current_route_translation) {
		return current_route_translation;
	} else if (current_route_translation === false) {
		return false;
	}

	let info = this.getRouteVariables();

	if (!info.route) {
		return;
	}

	// Don't just translate the last rendered route, make sure it's the current one
	if (info.url && Blast.isBrowser) {
		let url = RURL.parse(info.url);

		if (url && !url.matchesPath(window.location)) {
			return;
		}
	}

	let config = this.routeConfig(info.route);

	if (!config) {
		return;
	}

	// Get the url string
	let url = this.routeUrl(info.route, info.params, {locale: prefix});

	// Turn it into an RURL object
	url = RURL.parse(url);

	if (url && url.pathname == '/') {
		url.pathname = '/' + prefix + url.pathname;
	}

	// Don't return urls with missing parameters
	if (url.pathname.indexOf('{') > -1) {
		return false;
	}

	// Add the get queries
	if (info.url && info.url.search) {
		let key;

		for (key in info.url.query) {

			if (key == 'hajax' || key == 'h_diversion' || key == 'htop') {
				continue;
			}

			url.addQuery(key, info.url.query[key]);
		}
	}

	return url;
});

/**
 * Turn the given element into a language switcher
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.3.0
 *
 * @param    {Element}   element    The element to apply to
 * @param    {string}    language   The actual language
 * @param    {Object}    options
 */
Router.setMethod(function languageSwitcherDirective(element, language, options) {

	element.setAttribute('hreflang', language);
	element.setAttribute('data-he-link', 'false');
	element.setAttribute('data-alchemy-language-switch', language);
	element.setAttribute('rel', 'nofollow');

	this.updateLanguageSwitcher(element, element.hawkejs_renderer?.variables);
});

/**
 * The switch language element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.1
 * @version  1.1.0
 */
Router.setMethod(function languageSwitcher(options) {

	if (arguments.length == 3) {
		return this.languageSwitcherDirective(...arguments);
	}

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