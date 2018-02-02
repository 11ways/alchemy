module.exports = function publicConduit(Hawkejs, Blast) {

	/**
	 * The Conduit class
	 * (on the client side)
	 *
	 * @constructor
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Conduit = Function.inherits('Alchemy.Client.Base', function Conduit(url) {

		// Reference to ourselves
		this.conduit = this;

		// The original requested url
		this.url = url;

		// New cookies
		this.new_cookies = {};

		// The headers to "send"
		this.response_headers = {};
	});

	if (Blast.isNode) {
		return;
	}

	/**
	 * Get the alchemy routes, compile paths
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Object}
	 */
	Hawkejs.Scene.setMethod(function getAlchemyRoutes() {

		var exposed_routes = hawkejs.scene.exposed.routes,
		    section_name,
		    section,
		    prefix,
		    route,
		    name;

		if (this._alchemy_routes && this._alchemy_routes == exposed_routes) {
			return exposed_routes;
		}

		for (section_name in exposed_routes) {
			section = exposed_routes[section_name];

			for (name in section) {
				route = section[name];
				route.compiled_paths = {};

				for (prefix in route.paths) {
					route.compiled_paths[prefix] = new Blast.Classes.Alchemy.PathDefinition(route.paths[prefix]);
				}
			}
		}

		this._alchemy_routes = exposed_routes;
		return exposed_routes;
	});

	/**
	 * Intercept Scene#openUrl calls
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.Scene.setMethod(function interceptOpenUrl(url, options) {

		var section_name,
		    path_prefix,
		    section,
		    conduit,
		    prefix = '',
		    routes,
		    pledge,
		    tasks,
		    route,
		    path = url.pathname,
		    key;

		console.log('Intercepting?', url, options);
		console.log('Path:', path)
		pledge = new Blast.Classes.Pledge();

		for (key in hawkejs.scene.exposed.prefixes) {
			path_prefix = '/' + key + '/';

			if (path.startsWith(path_prefix)) {
				prefix = key;
				path = '/' + path.after(path_prefix);
				break;
			}
		}

		routes = this.getAlchemyRoutes();
		tasks = [];

		// @TODO: paths should have the same order as on the server
		for (section_name in routes) {
			section = routes[section_name];

			Object.each(section, function eachRoute(route, section_name) {
				var definition = route.compiled_paths[prefix];

				if (!definition) {
					return;
				}

				tasks.push(function testDefinition(next) {

					var temp = definition.test(path, conduit);

					if (!temp) {
						return next();
					}

					if (temp.then) {
						return temp.then(function resolved(value) {

							if (!value) {
								return next(null);
							}

							doRoute(route, value, next);
						}).catch(function rejected(err) {
							return next(err);
						});
					}

					doRoute(route, temp, next);
				});
			});
		}

		if (tasks.length) {
			conduit = new Conduit(url);
			console.log('Created conduit:', conduit);
		}

		Function.series(tasks, function done(err) {

			if (err) {
				pledge.reject(err);
			}

			pledge.reject('No matching client-side route found');
		});

		function doRoute(route, value, next) {

			var controller;

			console.log('Got match:', value, 'for', route);

			if (!route.controller || !route.action) {
				return next();
			}

			controller = Blast.Classes.Alchemy.Client.Controller[route.controller];

			if (!controller || !controller.actions[route.action]) {
				console.log('Controller', controller, route.controller, 'has no action', route.action)
				return next();
			}

			// Put conduit back on top
			value.unshift(conduit);

			// Create the controller instance
			controller = new controller(conduit);

			console.log('Calling action', route.action, 'with', value, 'on controller', controller);

			// Call the action
			controller.constructor.actions[route.action].apply(controller, value);

			// Extract the controller & action from the route
			// (still needs to be added to the object from the server)
			// and call it!
			// If none is found, call next
		}

		return pledge;
	});
};