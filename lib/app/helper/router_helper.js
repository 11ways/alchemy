module.exports = function HawkejsRouter(Hawkejs, Blast) {

	var Router = Hawkejs.Helper.extend(function RouterHelper(view) {
		Hawkejs.Helper.call(this, view);
	});

	/**
	 * Return route name info
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Object}   parameters
	 */
	Router.setMethod(function routeUrl(name, parameters, options) {

		var config,
		    url;

		url = '';
		config = this.routeConfig(name);

		if (config != null) {
			url = config.paths[''];
			url = url.fillPlaceholders(parameters);
		}

		return url;
	});

	/**
	 * Print out an anchor
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
		    url;

		url = '';
		config = this.routeConfig(name);

		if (options == null) {
			options = {};
		}

		if (options.handleManual) {
			className = '';
		} else {
			className = 'js-he-link ';
		}

		if (options.className) {
			className += options.className;
		}

		if (config != null) {
			url = config.paths[''];
			url = url.fillPlaceholders(parameters);

			this.print('<a class="' + className + '" href="' + url + '">');
			this.print(options.title || config.name);
			this.print('</a>');
		}
	});
};