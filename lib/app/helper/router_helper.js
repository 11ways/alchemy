module.exports = function HawkejsRouter(Hawkejs, Blast) {

	var Router = Hawkejs.Helper.extend(function RouterHelper(view) {
		Hawkejs.Helper.call(this, view);
	});

	/**
	 * Return route name info
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.2.0
	 * @version  1.0.0
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
		    config,
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
		config = {};

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
			result = {
				section: section,
				name: name
			};

			if (socket_route) {
				result.socket_route = true;
			} else {
				result.socket_route = false;
				result.paths = routes[section][name].paths;
				result.breadcrumb = routes[section][name].breadcrumb;
				result.has_breadcrumb_assignments = routes[section][name].has_breadcrumb_assignments;
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
		config = this.routeConfig(name);
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
			url = url.replace(/\[.*\]/g, '');
			url = url.assign(parameters, true);

			console.log('Assigned', parameters, ': ' + url)
		}

		url = this.parseURL(url);

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

		if (options.full) {
			base_url = this.view.internal('url');
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

		this.view.print_element('breadcrumb/wrapper');
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
	 * @version  0.4.0
	 *
	 * @param    {String}   name
	 * @param    {Object}   parameters
	 */
	Router.setMethod(function printRoute(name, parameters, options) {

		var that = this,
		    placeholder;

		placeholder = this.placeholder(function routeResolver(callback) {

			var html = that.getAnchor(name, parameters, options);

			// If it has already been closed,
			// only print out the opening tag
			if (html && placeholder.closed_route) {
				html = html.outerHTML.before('>') + '>';
			}

			callback(null, html);
		});

		this.open_route = placeholder;

		this.print(placeholder);
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
			this.open_route.closed_route = true;
			this.open_route = null;
		}

		this.print('</a>');
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
			anchor = this.view.add_link(url);

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
				anchor.setAttribute('title', options.title);
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

		return this.view.add_link('#');
	});

	/**
	 * The switch language element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.4.1
	 * @version  0.4.1
	 */
	Router.setMethod(function languageSwitcher(options) {

		var prefixes = this.view.expose('prefixes'),
		    prefix,
		    config,
		    locale;

		if (this.view.expose('locales')) {
			locale = this.view.expose('locales')[0];
		}

		this.print('<select class="language-switcher');

		if (options && options.className) {
			this.print(' ' + options.className);
		}

		this.print('" onchange="alchemy.switchLanguage(this)">');

		for (prefix in prefixes) {
			config = prefixes[prefix];

			this.print('<option value="' + prefix + '"');

			if (prefix == locale) {
				this.print(' selected');
			}

			this.print('>');

			this.print(this.view.__('language.' + prefix));
			this.print('</option>');
		}

		this.print('</select>');
	});
};