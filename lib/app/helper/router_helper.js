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
	 *
	 * @return   {Object}
	 */
	Router.setMethod(function routeConfig(name) {

		var section,
		    pieces,
		    routes,
		    result,
		    name,
		    key;

		routes = this.view.expose('routes');

		if (!routes && Blast.isNode) {
			routes = global.Router.getRoutes();
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
				name: name,
				paths: routes[section][name]
			};

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

		var className,
		    config,
		    anchor,
		    inner,
		    name,
		    url;

		url = '';
		config = this.routeConfig(name);

		if (options == null) {
			options = {};
		}

		if (options.handleManual) {
			className = '';
		} else {
			className = 'js-he-link';
		}

		if (config != null) {
			// Get the url, remove any types
			url = this.routeUrl(name, parameters, options);

			anchor = this.view.buildElement('a', options);
			anchor.addClass(className)

			if (options.className) {
				anchor.addClass(options.className);
			}

			if (options.innerWrap) {
				inner = this.view.buildElement(options.innerWrap);
			} else {
				inner = anchor;
			}

			anchor.attr('href', url);
			inner.setContent(options.content || options.title || config.name);

			if (options.title){
				anchor.attr('title', options.title);
			}

			if (options.innerWrap) {
				anchor.setContent(inner);
			}

			if (options.divert) {
				anchor.data('divert', options.divert);
			}

			if (options.history === false) {
				anchor.data('history', false);
			}

			for (name in options.attributes) {
				anchor.attr(name, options.attributes[name]);
			}

			this.print(anchor);

			return anchor;
		}
	});
};