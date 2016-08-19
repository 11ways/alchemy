var instances = {};

/**
 * Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 */
global.Datasource = Function.inherits('Alchemy.Base', function Datasource(name, options) {

	this.name = name;

	this.options = Object.assign(this.options, options);
});

/**
 * Enable query caching according to settings
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setProperty('queryCache', !!alchemy.settings.model_query_cache_duration);

/**
 * Hash a string synchronously
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   str
 *
 * @return   {String}
 */
Datasource.setMethod(function hashString(str) {
	return Object.checksum(str);
});

/**
 * Prepare record to be stored in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         data
 */
Datasource.setMethod(function toDatasource(schema, data, callback) {

	var that = this,
	    tasks;

	if (schema != null && !(schema instanceof Classes.Alchemy.Schema)) {
		schema = schema.schema || schema.blueprint;
	}

	if (schema == null) {
		log.todo('Schema not found: not normalizing data');
		return callback(null, data);
	}

	data = Object.assign({}, data);
	tasks = {};

	Object.each(data, function eachField(value, fieldName) {

		var field = schema.get(fieldName);

		if (field != null) {
			tasks[fieldName] = function doToDatasource(next) {
				that.valueToDatasource(field, value, data, next);
			};
		}
	});

	Function.parallel(tasks, callback);
});

/**
 * Prepare to return the record from the database to the app
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         query
 * @param    {Object}         options
 * @param    {Object}         data
 */
Datasource.setMethod(function toApp(schema, query, options, data, callback) {

	var that = this,
	    tasks;

	if (!(schema instanceof Classes.Alchemy.Schema)) {
		schema = schema.blueprint || schema.schema;
	}

	if (schema == null) {
		log.todo('Schema not found: not unnormalizing data');
		return callback(null, data);
	}

	data = Object.assign({}, data);
	tasks = {};

	Object.each(data, function eachField(value, fieldName) {

		var field = schema.get(fieldName);

		if (field != null) {
			tasks[fieldName] = function doToDatasource(next) {
				that.valueToApp(field, query, options, value, next);
			};
		}
	});

	Function.parallel(tasks, callback);
});

/**
 * Prepare value to be stored in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function valueToDatasource(field, value, data, callback) {

	var that = this;

	field.toDatasource(value, data, this, function gotDatasourceValue(err, value) {

		if (err) {
			return callback(err);
		}

		that._valueToDatasource(field, value, data, callback);
	});
});

/**
 * Prepare value to be returned to the app
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function valueToApp(field, query, options, value, callback) {

	var that = this;

	field.toApp(query, options, value, function gotToAppValue(err, value) {
		if (err) {
			return callback(err);
		}

		that._valueToApp(field, query, options, value, callback);
	});
});

/**
 * Prepare value to be stored in the database.
 * Should be overridden by extended datasources.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _valueToDatasource(field, value, data, callback) {
	setImmediate(function immediateDelay() {
		callback(null, value);
	});
});

/**
 * Prepare value to be returned to the app.
 * Should be overridden by extended datasources.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _valueToApp(field, query, options, value, callback) {
	setImmediate(function immediateDelay() {
		callback(null, value);
	});
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function create(model, data, options, callback) {

	var that = this;

	// Normalize the data
	this.toDatasource(model, data, function gotDatasourceValue(err, data) {

		if (err) {
			return callback(err);
		}

		// Call the real _create method
		that._create(model, data, options, callback);
	});
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function read(model, query, options, callback) {

	var that = this,
	    cacheResult,
	    serialized,
	    result;

	// Serialize the query conditions to a string, using JSON-dry
	if (this.queryCache && model.cache) {
		serialized = 'query-' + Object.checksum(query) + '-' + Object.checksum(options);

		cacheResult = model.cache.get(serialized, true);

		if (cacheResult != null) {
			setImmediate(function returnCache() {

				model.emit('fetching_cache', options);

				// Clone the clone
				result = JSON.clone(cacheResult.items);

				model.emit('fetched_cache', options, result);

				// Return the results
				callback(null, result, cacheResult.available);
			});

			return;
		}
	}

	// Cache is disabled or not found: perform the query
	this._read(model, query, options, function afterRead(err, results, available) {

		var tasks,
		    i;

		if (err != null) {
			return callback(err);
		}

		tasks = results.map(function eachEntry(entry) {
			return function entryToApp(next) {
				that.toApp(model, query, options, entry, next);
			};
		});

		Function.parallel(tasks, function done(err, app_results) {

			var cloned;

			if (err) {
				return callback(err);
			}

			if (serialized != null) {

				// Emit the storing_cache event
				model.emit('storing_cache', options, app_results);

				// Do the actual cloning
				cloned = JSON.clone(app_results);

				// Store the cloned object in the cache
				model.cache.set(serialized, {items: cloned, available: available});

				// Emit the stored_cache event
				model.emit('stored_cache', options, app_results);
			}

			callback(null, app_results, available);
		});
	});
});

/**
 * Update data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function update(model, data, options, callback) {

	var that = this;

	// Normalize the data
	this.toDatasource(model, data, function gotDatasourceValue(err, data) {

		if (err) {
			return callback(err);
		}

		// Call the real _create method
		that._update(model, data, options, callback);
	});
});

/**
 * Remove data from the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function remove(model, query, options, callback) {
	this._remove(model, query, options, callback);
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function ensureIndex(model, index, callback) {
	this._ensureIndex(model, index, callback);
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _create(model, data, options, callback) {
	throw new Error('Create method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _read(model, query, options, callback) {
	throw new Error('Read method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Update data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _update(model, data, options, callback) {
	throw new Error('Update method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Remove data from the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _remove(model, query, options, callback) {
	throw new Error('Remove method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _ensureIndex(model, index, callback) {
	throw new Error('Ensure Index method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Create a new datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.create = function create(type, name, options) {

	var className = type.classify() + 'Datasource',
	    instance;

	if (!Classes.Alchemy[className]) {
		throw new Error('Datasource type "' + type + '" does not exist');
	}

	instance = new Classes.Alchemy[className](name, options);
	instances[name] = instance;

	return instances;
};

/**
 * Get a datasource instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.get = function get(name) {

	if (!name) {
		return instances;
	}

	return instances[name];
};