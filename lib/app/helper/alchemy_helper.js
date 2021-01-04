/**
 * The Alchemy helper
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {ViewRender}    view
 */
var Alchemy = Function.inherits('Alchemy.Helper', function Alchemy(view) {
	Alchemy.super.call(this, view);
});

/**
 * Function to execute on the client side, when the scene is made
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.7
 *
 * @param    {Scene}   scene
 * @param    {Object}  options
 */
Alchemy.setStatic(function onScene(scene, options) {
	window.alchemy.initScene(scene, options);
});

/**
 * Perform a resource request
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.3
 *
 * @param    {String|Object}   options
 * @param    {Object}          data
 * @param    {Function}        callback
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function getResource(options, data, callback) {

	var that = this,
	    conduit,
	    config,
	    pledge,
	    url;

	if (typeof options == 'string') {

		if (options.indexOf('/') > -1) {
			options = {
				href : options
			};
		} else {
			options = {
				name : options
			};
		}
	} else if (options instanceof Classes.RURL) {
		options = {
			href : options
		};
	}

	if (typeof data == 'function') {
		callback = data;
		data = null;
	} else {
		options.params = data;
	}

	if (!options.name && !options.href) {
		pledge = Classes.Pledge.reject(new Error('Unable to get alchemy resource, a `name` or `href` option is required'));
		pledge.done(callback);
		return pledge;
	}

	function resolvePledge(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(result);
	}

	if (Blast.isNode) {
		conduit = this.view.server_var('conduit');

		if (!conduit) {
			pledge = Classes.Pledge.reject(new Error('Could not find conduit, alchemy resource will not be fetched'));
			pledge.done(callback);
			return pledge;
		}

		pledge = new Classes.Pledge();
		pledge.done(callback);

		conduit.loopback(options, resolvePledge);

		return pledge;
	}

	if (options.href) {
		url = options.href;
	} else {

		// See if this is a socket route
		config = this.view.helpers.Router.routeConfig(options.name, true);

		if (config && config.socket_route) {
			pledge = new Classes.Pledge();
			pledge.done(callback);

			// In this case the "alchemy" variable points to the window.alchemy object
			alchemy.submit(config.name, data, resolvePledge);

			return pledge;
		}

		// Get the url to the resource
		url = hawkejs.scene.helpers.Router.routeUrl(options.name, options.params);

		if (!url && typeof name == 'string') {
			url = hawkejs.scene.helpers.Router.routeUrl('APIResource', {name: options.name});
		}

		if (!url) {
			pledge = Classes.Pledge.reject(new Error('No URL could be found for route "' + options.name + '"'));
			pledge.done(callback);
			return pledge;
		}
	}

	options.href = url;

	if (data) {
		options.get = data;
	}

	pledge = hawkejs.scene.fetch(options);
	pledge.done(callback);

	return pledge;
});

/**
 * Register & recompile a callback
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.2.0
 * @version       0.2.0
 *
 * @param         {Function}   callback
 *
 * @return        {Function}
 */
Alchemy.setMethod(function registerCallback(callback) {

	if (!this.callbacks) {
		this.callbacks = {};
	}

	// The callback will need to be recompiled
	if (!this.callbacks[callback.name]) {
		this.callbacks[callback.name] = this.view.hawkejs.compile({

			// The function that will be re-compiled
			compiled: callback,

			// Template name
			template_name: 'callback_' + callback.name,

			// It's a single function that needs to be called with the 'group_arg' var
			call: 'group_arg',

			// Make sure these variables are available in the scope
			scope: this.view.functionScopes.slice(0)
		});
	}

	return this.callbacks[callback.name];
});

/**
 * Register a group and possible id
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.2.0
 * @version       0.2.0
 */
Alchemy.setMethod(function registerGroup(name, id, callback) {

	// Make sure the groups exist
	if (!this.groups) {
		this.groups = {};
	}

	if (!this.groups[name]) {
		this.groups[name] = {
			state: 'new',
			hinder: null,
			ids: []
		};
	}

	if (id && !this.groups[name].ids[id]) {
		this.groups[name].ids[id] = [];
	}

	if (callback) {
		this.registerCallback(callback);
		this.groups[name].ids[id].push(callback);
	}
});

/**
 * Get the group data
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.2.0
 * @version       0.2.0
 */
Alchemy.setMethod(function getGroupData(name, callback) {

	var that = this,
	    group;

	group = this.groups[name];

	if (!group.hinder) {
		group.hinder = Function.hinder(function getData(done) {
			that.getResource(name, {ids: Object.keys(group.ids)}, done);
		});
	}

	if (callback) group.hinder.push(callback);
});

/**
 * Aggregate data.
 * The callback needs to be named and be unique per scope structure
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.2.0
 * @version       0.2.0
 */
Alchemy.setMethod(function group(name, id, callback) {

	var that = this,
	    scope;

	// Keep reference to the current scope
	scope = this.view.functionScopes.slice(0);

	// Register the group and callback
	this.registerGroup(name, id, callback);

	// Return an async placeholder
	this.view.async(function doAsync(next) {
		that.getGroupData(name, function gotData(err, data) {

			var id_data;

			if (err) {
				return next(err);
			}

			if (data) {
				id_data = data[id];
			}

			that.view.hawkejs.render(that.registerCallback(callback), {__scope: scope, group_arg: id_data}, next);
		});
	});
});

/**
 * Print a segment
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.1.5
 *
 * @param    {String|Object}   options
 * @param    {Object}          data
 */
Alchemy.setMethod(function segment(options, data) {

	var that = this;

	if (typeof options == 'string') {
		options = {
			name : options
		};
	}

	let start = Date.now();

	// Prints a placeholder
	this.view.async(function doAsync(next) {

		var conduit,
		    route;

		if (Blast.isNode) {
			conduit = that.view.server_var('conduit');

			if (!conduit) {
				return next();
			}

			options.params = data;

			conduit.loopback(options, function doneLoopback(err, res) {
				// Response can be an HTML string or a Hawkejs.BlockBuffer instance
				next(err, res);
			});

			return;
		}

		// Create a dummy root element so the renderer
		// does not place it anywhere else
		let root = document.createElement('div');

		// Get the route configuration
		route = that.view.helpers.Router.routeUrl(options.name, data, {extra_get_parameters: false});

		hawkejs.scene.openUrl(route, {get: data, history: false, root: root}, function done(err, result) {

			if (err) {
				return next(err);
			}

			if (!result) {
				return next();
			}

			let block = result.blocks.get(result.main_block_name);

			next(null, block);
		});
	});
});

/**
 * Get the current locale
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {String}
 */
Alchemy.setMethod(function getLocale() {

	var locales = this.view_render.expose('locales');

	if (locales && locales[0]) {
		return locales[0];
	}

	return 'en';
});

if (!Blast.isBrowser) {
	return;
}

// Send a message to the server when we unload the page
window.addEventListener('unload', function(event) {
	if (console) {
		console.log('Unloading the page ...');
	}
});