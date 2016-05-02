module.exports = function HawkejsRouter(Hawkejs, Blast) {

	var Router = Hawkejs.Helper.extend(function RouterHelper(view) {
		Hawkejs.Helper.call(this, view);
	});

	/**
	 * Return route name info
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
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
		    name,
		    key;

		if (socket_route) {
			routes = this.view.expose('socket_routes');

			if (!routes && Blast.isNode) {
				routes = global.Router.getSocketRoutes();
			}
		} else {

			routes = this.view.expose('routes');

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
				result.paths = routes[section][name];
			}

			return result;
		}

		return null;
	});

	/**
	 * Return the plain url for the given url name & parameters object
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Object}   parameters
	 */
	Router.setMethod(function routeUrl(name, _parameters, options) {

		var parameters,
		    config,
		    url;

		url = '';
		config = this.routeConfig(name);
		parameters = Blast.Bound.Object.assign({}, _parameters);

		if (config != null) {
			url = config.paths[''].replace(/\[.*\]\:/g, ':');
			url = url.fillPlaceholders(parameters, true);
		}

		if (options && options.get) {
			url += '?' + Blast.Bound.URL.encodeQuery(options.get);
		}

		// Add non-used parameters as GET
		if (!Object.isEmpty(parameters)) {
			if (!options || !options.get) {
				url += '?';
			}

			url += Blast.Bound.URL.encodeQuery(parameters);
		}

		if (options && options.hash) {
			url += '#' + options.hash;
		}

		return url;
	});

	/**
	 * Print out an anchor
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Object}   parameters
	 */
	Router.setMethod(function printRoute(name, parameters, options) {

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

			if (options.className) {
				pieces = options.className.split(' ');

				for (i = 0; i < pieces.length; i++) {
					anchor.classList.add(pieces[i]);
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

			this.print(anchor);

			return anchor;
		}
	});
};