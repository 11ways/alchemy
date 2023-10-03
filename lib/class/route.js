/**
 * Route Class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.16
 */
const Route = Function.inherits('Alchemy.Base', function Route(router, paths, options) {

	// Store the parent router
	this.router = router;

	// Store the route options
	this.options = options;

	// This is not middleware by default
	this.is_middleware = options.is_middleware || false;

	// The methods to listen to
	this.methods = null;

	// The paths to listen to
	this.paths = null;

	// The weight of this route (read-only)
	this.weight = null;

	// Is this route prefix-aware?
	this.is_prefix_aware = false;

	// The name of this route
	this.name = null;

	// The optional function
	this.fnc = null;

	// All the keys used
	this.keys = null;

	// The breadcrumb string
	this.breadcrumb = '';
	this.has_breadcrumb_assignments = false;

	// The optional permissions to check
	this.permission = null;
	this.has_permission_assignments = false;

	// The sitemap configuration
	this.sitemap = null;

	// Can this route's path be used in the browser's address location?
	this.visible_location = true;

	// Is this a system route of some kind?
	// (meaning: not for end users)
	this.is_system_route = false;

	// If no fnc is given, these will be called
	this.controller = null;
	this.action = null;

	// All routes can be postponed by default
	this.can_be_postponed = true;

	this.setPaths(paths);
});

/**
 * Deprecated property names
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Route.setDeprecatedProperty('isMiddleware', 'is_middleware');

/**
 * Does this route require extra data for translating to another language?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Boolean}
 */
Route.setProperty(function requires_data_for_translation() {

	if (!this.is_prefix_aware || !this.has_path_assignments) {
		return false;
	}

	return true;
});

/**
 * Does this route have any path assignments?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Boolean}
 */
Route.setProperty(function has_path_assignments() {
	return !!this.keys?.length;
});

/**
 * Does this route use any type class checks?
 * (Type CLASS checks use the type checker of a specific class)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Boolean}
 */
Route.setProperty(function has_type_class_checks() {

	let result = false,
	    path,
	    key;

	for (key in this.paths) {
		path = this.paths[key];

		if (path.uses_type_class_checks) {
			result = true;
			break;
		}
	}

	return result;
});

/**
 * Routes with parameters can have schemas
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.7
 * @version  1.3.7
 *
 * @return   {Schema}
 */
Route.enforceProperty(function schema(new_value) {

	if (new_value) {
		return new_value;
	}

	if (!this.has_path_assignments) {
		return false;
	}

	let added_models = {},
	    added_fields = {},
	    prefix,
	    param,
	    model_constructor,
	    definition;

	new_value = alchemy.createSchema();
	
	for (prefix in this.paths) {
		definition = this.paths[prefix];

		if (!definition?.param_definitions?.length) {
			continue;
		}

		for (param of definition.param_definitions) {
			model_constructor = param.model_constructor;

			if (model_constructor) {

				if (added_models[model_constructor.name]) {
					continue;
				}

				if (added_fields[param.name]) {
					continue;
				}

				added_models[model_constructor.name] = true;

				try {
					new_value.belongsTo(model_constructor.name);
				} catch (err) {
					// Ignored
					alchemy.distinctProblem('route-schema-' + this.name, 'Route schema error', {error: err});
				}
			} else {
				new_value.addField(param.name, 'String');
				added_fields[param.name] = true;
			}
		}
	}

	return new_value;
});

/**
 * Get all the param definitions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.7
 * @version  1.3.7
 *
 * @return   {Object}
 */
Route.enforceProperty(function param_definitions(new_value) {

	if (new_value) {
		return new_value;
	}

	let prefix,
	    param,
	    key,
	    definition;

	new_value = {};

	for (prefix in this.paths) {
		definition = this.paths[prefix];

		if (!definition.param_definitions?.length) {
			continue;
		}

		for (param of definition.param_definitions) {
			key = prefix + '_' + param.name;

			new_value[key] = {
				name            : param.name,
				type_class_name : param.type_class_name,
				type_field_name : param.type_field_name,
				is_model_type   : param.is_model_type,
			};
		}
	}

	return new_value;
});

/**
 * Set the breadcrumb for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   breadcrumb
 */
Route.setMethod(function setBreadcrumb(breadcrumb) {

	var assignments;

	if (!breadcrumb) {
		breadcrumb = '';
	} else {
		// See if this breadcrumb has assignments
		assignments = breadcrumb.assignments();

		if (assignments.length) {
			this.has_breadcrumb_assignments = true;
		}
	}

	this.breadcrumb = breadcrumb;
});

/**
 * Set the permissions for this route
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {String|String[]}   permission
 */
Route.setMethod(function setPermission(permission) {

	if (!permission) {
		return;
	}

	permission = Array.cast(permission);

	this.permission = permission;

	for (let entry of permission) {
		let assignments = entry.assignments();

		if (assignments.length) {
			this.has_permission_assignments = true;
			break;
		}
	}
});

/**
 * Set if this route can be postponed
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Boolean}   postponable
 */
Route.setMethod(function setCanBePostponed(postponable) {
	this.can_be_postponed = postponable;
});

/**
 * Compile paths for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setPaths(paths) {

	// Certain routes (like socket only routes)
	// have no paths
	if (paths == null) {
		return;
	}

	let definition,
	    prefix,
	    keys = [],
	    path;

	if (!Object.isPlainObject(paths)) {
		paths = {'': paths};
	} else {
		this.is_prefix_aware = true;
	}

	// Reset the paths
	this.paths = {};

	for (prefix in paths) {
		path = paths[prefix];
		definition = new Classes.Alchemy.PathDefinition(path, {
			prefix,
			end: !this.is_middleware,
		});
		this.paths[prefix] = definition;

		if (definition.keys.length) {
			keys.include(definition.keys);
		}
	}

	// Only use the unique values
	this.keys = keys.unique();
});

/**
 * Match the given path & prefix to this route,
 * and return the in-url named parameters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.5
 *
 * @param    {String}   method
 * @param    {String}   path     The path (without the prefix)
 * @param    {String}   prefix   The prefix name
 *
 * @return   {Boolean|Object}    False if it doesn't match, or named params
 */
Route.setMethod(function match(conduit, method, path, prefix) {

	conduit.markRouteAsTested(this);

	if (this.methods && this.methods.indexOf(method) == -1) {
		return false;
	}

	let result = false;

	if (!prefix) {
		prefix = '';
	}

	path = path.before('?') || path;

	// If this route isn't prefix aware, but a prefix was detected in the route,
	// see if we can add it
	if (!this.is_prefix_aware && prefix) {

		// Prepend the prefix ONLY if the path doesn't equal the prefix already
		// For example: don't turn "/nl" into "/nl/nl"
		if (path != ('/' + prefix)) {
			path = '/' + prefix + path;
		}

		prefix = '';
	}

	if (this.paths[prefix]) {

		// Get the path definition, including the regex & keys array
		let definition = this.paths[prefix];

		// Test it
		let temp = definition.test(path, conduit);

		if (!temp) {
			return false;
		}

		if (temp.then) {
			let pledge = new Blast.Classes.Pledge();

			temp.then(function gotValue(values) {

				if (!values) {
					return pledge.resolve(null);
				}

				pledge.resolve({
					definition          : definition,
					parameters          : definition.getParametersObject(values),
					original_parameters : definition.getParametersObject(values, 'original_value'),
					parameters_array    : values
				});
			});

			temp.catch(function onError(err) {
				pledge.reject(err);
			});

			return pledge;
		}

		result = {
			definition          : definition,
			parameters          : definition.getParametersObject(temp),
			original_parameters : definition.getParametersObject(temp, 'original_value'),
			parameters_array    : temp
		};
	}

	return result;
});


/**
 * Set handler
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|Object}   paths
 */
Route.setMethod(function setHandler(fnc) {

	var assignments,
	    split;

	if (typeof fnc === 'function') {
		this.fnc = fnc;
		return;
	}

	// Strings like 'StaticController#index'
	if (typeof fnc === 'string') {

		split = fnc.split('#');
		this.controller = split[0];
		this.action = split[1];

		// See if there are assignments in the string
		assignments = fnc.assignments();

		// If there are assignments,
		// the controller & action will be different upon each request
		if (assignments.length) {
			this.fnc = this.callControllerAssignments;
		} else {
			this.fnc = this.callController;
		}
	}
});

/**
 * Check the policy
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.1.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function checkPolicy(conduit) {

	var policy = this.options.policy;

	if (!policy) {
		return true;
	}

	if (policy == 'logged_in') {
		let user_data = conduit.session('UserData');

		if (user_data && user_data.$pk) {
			return true;
		}
	} else if (typeof policy == 'function') {
		return policy.call(this, conduit);
	}

	return false;
});

/**
 * Check the permission
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function checkPermission(conduit) {

	// Check the rouer section first
	if (!this.router.checkPermission(conduit)) {
		return false;
	}

	if (!this.permission) {
		return true;
	}

	let permission;

	for (permission of this.permission) {

		if (this.has_permission_assignments) {
			permission = permission.assign(conduit.route_string_parameters).toLowerCase();
		}

		if (conduit.hasPermission(permission)) {
			return true;
		}
	}

	return false;
});

/**
 * Call the handler for this route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.5
 *
 * @param    {Conduit}   conduit
 * @param    {Array}     parameters
 */
Route.setMethod(async function callHandler(conduit, parameters) {

	var breadcrumb,
	    parameters,
	    keys,
	    i;

	if (this.fnc) {

		if (!this.checkPermission(conduit)) {

			let user = conduit.session('UserData');

			if (!user) {
				return conduit.notAuthorized();
			} else {
				return conduit.forbidden();
			}
		}

		if (this.options.policy && !await this.checkPolicy(conduit)) {
			return conduit.notAuthorized();
		}

		// If a client-side render is preferred and a layout is given,
		// only render the layout
		if (Blast.isNode && !conduit.ajax && this.options.prefer == 'client' && this.options.layout) {
			conduit.internal('force_client_render', true);
			return conduit.render(this.options.layout);
		}

		// If no arguments are given as an array,
		// construct them if needed
		if (!parameters) {

			// If this is a socket call, and there are no parameters,
			// use the body
			// @TODO: what about streams?
			if (this.methods.indexOf('socket') > -1) {

				if (conduit.loopback_arguments) {
					parameters = conduit.loopback_arguments;
				} else {
					parameters = Array.cast(conduit.body);
				}

				// Add the end method
				parameters.push(function cb(err) {

					var args;

					if (err) {
						return conduit.error(err);
					}

					args = Array.cast(arguments);
					args.shift();

					conduit.end.apply(conduit, args);
				});

			} else {

				// Old-style path definitions made from regexes have no named
				// parameters, so use their indexes as keys
				if (conduit.path_definition.from_regex) {
					keys = Object.keys(conduit.params);
				} else {
					keys = conduit.path_definition.keys;
				}

				parameters = new Array(keys.length);

				for (i = 0; i < keys.length; i++) {
					parameters[i] = conduit.params[keys[i]];
				}
			}
		}

		if (this.breadcrumb) {

			breadcrumb = this.breadcrumb;

			if (this.has_breadcrumb_assignments) {
				conduit.internal('breadcrumb_pattern', breadcrumb);

				// @TODO: {[Document]slug} parameters will be Documents,
				// so this results in [Object object] strings!
				breadcrumb = breadcrumb.assign(conduit.route_string_parameters).toLowerCase();
			}

			if (breadcrumb) {

				// Set the breadcrumb path
				conduit.internal('breadcrumb', breadcrumb);
			}
		}

		return this.fnc(conduit, ...parameters);
	}

	throw new Error('No valid handler was found');
});

/**
 * Generate a url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  1.2.5
 *
 * @param    {Object}                  parameters  (optional)
 * @param    {Object|Alchemy.Conduit}  conduit     Conduit or options (optional)
 */
Route.setMethod(function generateUrl(parameters, conduit) {

	// Use the "no locale" by default
	let locale = '';

	// If a conduit is given, get the locale
	if (conduit) {
		if (conduit.locales) {
			let i;
			for (i = 0; i < conduit.locales.length; i++) {
				if (this.paths[conduit.locales[i]]) {
					locale = conduit.locales[i];
					break;
				}
			}
		}

		if (!locale && conduit.locale) {
			locale = conduit.locale;
		}
	}

	return Router.getUrl(this.name, parameters, {locale});
});

/**
 * Call a controller action as handler.
 * This gets called by `callHandler`.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function callController(...args) {

	const conduit = args[0];

	if (this.controller) {
		let instance = Controller.get(this.controller, conduit);

		if (!instance) {
			return conduit.error(new Error('Could not find controller "' + this.controller + '"'));
		}

		return instance.doAction(this.action, args);
	}

	conduit.error(new Error('No valid controller was set'));
});

/**
 * Call a controller action as handler, but get info from the url first.
 * This gets called by `callHandler`.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {Conduit}   conduit
 */
Route.setMethod(function callControllerAssignments(...args) {

	const conduit = args[0];

	if (this.controller) {

		// Get the controller name from the route parameters
		let controller = this.controller.assign(conduit.params);

		// Try getting a controller instance
		let instance = Controller.get(controller, conduit);

		if (!instance) {
			throw new Error('Could not find controller "' + controller + '"');
		}

		let action = this.action.assign(conduit.params);
		return instance.doAction(action, args);
	}

	throw new Error('No valid controller was set');
});

/**
 * Set the values needed for translating this route
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Controller}   controller
 * @param    {Conduit}      conduit
 */
Route.setMethod(function getRouteTranslations(controller, conduit) {

	if (!this.has_type_class_checks) {
		return;
	}

	const current_prefix = conduit.prefix,
	      paths = [];

	let path;

	for (let key in this.paths) {

		if (!key || key == current_prefix) {
			continue;
		}

		path = this.paths[key];

		if (!path?.param_definitions?.length) {
			continue;
		}

		paths.push(path);
	}

	if (!paths.length) {
		return;
	}

	return this._getRouteTranslations(controller, conduit, paths);
});

/**
 * Do the actual path value translations
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.10
 *
 * @param    {Controller}   controller
 * @param    {Conduit}      conduit
 */
Route.setMethod(async function _getRouteTranslations(controller, conduit, paths) {

	let param_def,
	    result = {},
	    path;

	// Also add the current prefix
	result[conduit.prefix] = alchemy.routeUrl(this.name, conduit.route_string_parameters, {prefix: conduit.prefix});

	for (path of paths) {
		
		// Create a shallow clone of the original string parameters
		let params = Object.assign({}, conduit.route_string_parameters);

		for (param_def of path.param_definitions) {
			let current_value = conduit.param(param_def.name),
			    new_value;

			if (current_value && current_value.getTranslatedValueOfFieldForRoute) {
				new_value = await current_value.getTranslatedValueOfFieldForRoute(param_def.name, path.prefix);
			}

			if (!new_value) {
				params = false;
				break;
			}

			params[param_def.name] = new_value;
		}

		if (!params) {
			result[path.prefix] = false;
			continue;
		}

		result[path.prefix] = alchemy.routeUrl(this.name, params, {prefix: path.prefix});
	}

	return result;
});