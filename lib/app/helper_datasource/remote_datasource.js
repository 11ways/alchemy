/**
 * Remote Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Remote = Function.inherits('Alchemy.Datasource', function Remote(name, options) {
	// Call the parent constructor
	Remote.super.call(this, name, options);
});

/**
 * Do a remote action
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.7
 */
Remote.setMethod(async function doServerCommand(action, model, data, callback) {

	var that = this,
	    route_name,
	    conduit,
	    view;

	if (Blast.isNode && !model.hawkejs_view) {
		return callback(new Error('This model has no hawkejs view attached'));
	}

	if (!model || !model.getClassPathAfter) {
		console.log('Unable to get class path of model:', model);
		console.trace();
		return callback(new Error('Unable to get class path'));
	}

	route_name = model.getClassPathAfter('Model') + '#' + action;

	if (Blast.isNode) {
		view = model.hawkejs_view;
	} else {
		view = model.hawkejs_view || hawkejs.scene.generalView;
	}

	if (!view.helpers.Router.routeConfig(route_name)) {
		return callback(new Error('There is no ' + route_name + ' route, which is needed to query the database'));
	}

	if (Blast.isNode) {
		conduit = view.server_var('conduit');

		if (!conduit) {
			return callback(new Error('Could not find conduit, can not read datasource'));
		}

		conduit.loopback({
			name   : route_name,
			method : 'post',
			body   : data
		}, function gotResult(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, result.items, result.available);
		});

		return;
	}

	// @TODO: make alchemy load faster or something!
	while (typeof alchemy == 'undefined') {
		await Pledge.after(100, null);
	}

	if (data && typeof data == 'object') {
		data = JSON.dry(data);
	}

	let fetch_options = {
		post        : data,
		headers     : {'content-type': 'application/json-dry'},
		max_timeout : 3500 // A timeout of max 3.5s
	};

	alchemy.fetch(route_name, fetch_options, function gotResult(err, result) {

		if (err) {
			return callback(err);
		}

		if (result.items) {
			callback(null, result.items, result.available);
		} else {
			callback(null, result.saved_record);
		}
	});

});

/**
 * Query the remote database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Remote.setMethod(function read(model, criteria, callback) {

	var that = this,
	    data = {
		criteria : criteria
	};

	// Add cache?
	// {max_age: 10000, ignore_callbacks: true, static: true, cache_key: 'cache'}

	return this.doServerCommand('readDatasource', model, data, function done(err, items, available) {

		if (err) {
			if (err.status == 502 || err.status == 408) {
				// Should be caught by a fallback datasource from now on
				//return that.datasource.read('records', conditions, options, callback);
			}

			return callback(err);
		}

		callback(null, {
			items     : items,
			available : available
		});
	});
});

/**
 * Create something in the remote database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Remote.setMethod(function create(model, data, options, callback) {

	var that = this;

	data = {
		data    : data,
		options : options
	};

	return this.doServerCommand('saveRecord', model, data, function done(err, record) {

		if (err) {
			if (err.status == 502 || err.status == 408) {
				// Should be caught by a fallback datasource from now on
				//return that.datasource.read('records', conditions, options, callback);
			}

			return callback(err);
		}

		callback(null, record);
	});
});

/**
 * Update something in the remote database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Remote.setMethod(function update(model, data, options, callback) {

	var that = this;

	if (!options) {
		options = {};
	}

	options.create = false;

	data = {
		data    : data,
		options : options
	};

	return this.doServerCommand('saveRecord', model, data, function done(err, record) {

		if (err) {
			if (err.status == 502 || err.status == 408) {
				// Should be caught by a fallback datasource from now on
				//return that.datasource.read('records', conditions, options, callback);
			}

			return callback(err);
		}

		callback(null, record);
	});
});