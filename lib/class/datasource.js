var instances = {};

/**
 * Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
global.Datasource = Function.inherits('Alchemy.Base', function Datasource(name, options) {

	this.name = name;

	this.options = Object.assign(this.options || {}, options);
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
 * Set support flag for something
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}   name
 * @param    {Boolean}  value
 */
Datasource.setStatic(function setSupport(name, value) {
	this.constitute(function doSetSupport() {

		if (!this._support_flags) {
			this._support_flags = {};
		}

		this._support_flags[name] = value;
	});
});

/**
 * See if this supports the given flag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}   name
 *
 * @return   {Boolean}
 */
Datasource.setStatic(function supports(name) {

	if (!this._support_flags) {
		return null;
	}

	return this._support_flags[name];
});

/**
 * Instance method alias for support flags
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}   name
 *
 * @return   {Boolean}
 */
Datasource.setMethod(function supports(name) {
	return this.constructor.supports(name);
});

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
 * @version  1.0.4
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         data
 *
 * @return   {Pledge}
 */
Datasource.setMethod(function toDatasource(schema, data, callback) {

	var that = this,
	    pledge,
	    tasks;

	if (schema != null && !(schema instanceof Classes.Alchemy.Schema)) {
		schema = schema.schema;
	}

	if (!schema) {
		log.todo('Schema not found: not normalizing data');
		pledge = Pledge.resolve(data);
		pledge.handleCallback(callback);
		return pledge;
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

	pledge = Function.parallel(tasks, function done(err, result) {

		if (err) {
			return;
		}

		if (data.$_extra_fields) {
			Object.assign(result, data.$_extra_fields);
		}
	});

	pledge.handleCallback(callback);

	return pledge;
});

/**
 * Prepare to return the record from the database to the app
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.6
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         query
 * @param    {Object}         options
 * @param    {Object}         data
 *
 * @return   {Pledge}
 */
Datasource.setMethod(function toApp(schema, query, options, data, callback) {

	var that = this,
	    tasks;

	if (!(schema instanceof Classes.Alchemy.Schema)) {
		schema = schema.schema;
	}

	if (schema == null) {
		log.todo('Schema not found: not unnormalizing data');

		if (callback) {
			callback(null, data);
		}

		return Pledge.resolve(data);
	}

	data = Object.assign({}, data);
	tasks = {};

	options = Object.assign({}, options);

	if (!options._root_data) {
		options._root_data = data;
	}

	Object.each(data, function eachField(value, fieldName) {

		var field = schema.get(fieldName);

		if (field != null) {
			tasks[fieldName] = function doToDatasource(next) {
				that.valueToApp(field, query, options, value, next);
			};
		} else if (options.extraneous) {
			tasks[fieldName] = function addExtraneous(next) {
				next(null, value);
			};
		}
	});

	return Function.parallel(tasks, callback);
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
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Model}      model
 * @param    {Criteria}   criteria
 */
Datasource.setMethod(function read(model, criteria, callback) {

	var that = this,
	    pledge = new Pledge(),
	    hash;

	pledge.done(callback);

	// Look through the cache first
	if (this.queryCache && model.cache) {

		// Create a hash out of the criteria
		hash = 'criteria-' + Object.checksum(criteria);

		// See if it's in the cache
		let cached = model.cache.get(hash, true);

		if (cached) {
			cached.done(function gotCached(err, result) {

				if (err) {
					return pledge.reject(err);
				}

				model.emit('fetching_cache', criteria);

				// Clone the cached value
				result = JSON.clone(result);

				model.emit('fetched_cache', criteria, result);

				pledge.resolve(result);
			});

			return pledge;
		}
	}

	// Nothing in the cache, so do the actual reading
	that._read(model, criteria, function afterRead(err, results, available) {

		var sub_pledge,
		    tasks,
		    i;

		if (err) {
			return pledge.reject(err);
		}

		tasks = results.map(function eachEntry(entry) {
			return function entryToApp(next) {
				that.toApp(model, criteria, {}, entry, next);
			};
		});

		sub_pledge = Function.parallel(tasks, function done(err, app_results) {

			if (err) {
				return pledge.reject(err);
			}

			let result = {
				items     : app_results,
				available : available
			};

			if (hash) {
				let cloned = JSON.clone(result);

				// Emit the storing_cache event
				model.emit('storing_cache', criteria, cloned);
			}

			pledge.resolve(result);
		});

		pledge._addProgressPledge(sub_pledge);
	});

	if (this.queryCache && model.cache) {
		// Store the pledge in the cache
		model.cache.set(hash, pledge);
	}

	return pledge;
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.6
 *
 * @param    {Model}      model
 * @param    {Object}     data
 * @param    {Object}     options
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Datasource.setMethod(function create(model, data, options, callback) {

	var that = this,
	    pledge;

	pledge = Function.series(false, function toDatasource(next) {
		// Convert the data into something the datasource will understand
		that.toDatasource(model, data, next);
	}, function emitToDatasource(next, ds_data) {
		model.emit('to_datasource', data, ds_data, options, true, function afterTDSevent(err, stopped) {
			next(err, ds_data);
		});
	}, function doCreate(next, ds_data) {
		that._create(model, ds_data, options, next);
	}, function gotUpdateResult(next, result) {
		that.toApp(model, null, options, result, next);
	}, function done(err, result) {

		if (err) {
			return;
		}

		return result.last();
	});

	pledge.done(callback);

	return pledge;
});

/**
 * Update data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.6
 *
 * @param    {Model}      model
 * @param    {Object}     data
 * @param    {Object}     options
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Datasource.setMethod(function update(model, data, options, callback) {

	var that = this,
	    pledge;

	if (options.set_updated !== false) {
		// Set the updated field
		data.updated = new Date();
	}

	pledge = Function.series(false, function toDatasource(next) {
		// Convert the data into something the datasource will understand
		that.toDatasource(model, data, next);
	}, function emitToDatasource(next, ds_data) {
		model.emit('to_datasource', data, ds_data, options, false, function afterTDSevent(err, stopped) {
			next(err, ds_data);
		});
	}, function doUpdate(next, ds_data) {
		that._update(model, ds_data, options, next);
	}, function gotUpdateResult(next, result) {
		that.toApp(model, null, options, result, next);
	}, function done(err, result) {

		if (err) {
			return;
		}

		return result.last();
	});

	pledge.done(callback);

	return pledge;
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
 * @version  0.3.0
 */
Datasource.setMethod(function ensureIndex(model, index, callback) {

	if (typeof callback != 'function') {
		callback = Function.thrower;
	}

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
 * Setup the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Datasource.setMethod(function setup(callback) {

	var that = this,
	    tasks = [];

	// If this datasource needs to establish some kind of connection,
	// do that first
	if (typeof this.connect == 'function') {
		let pledge = this.connect();
		tasks.push(pledge);
	}

	if (typeof this.configureTable == 'function') {
		tasks.push(function getAllModels(next) {

			let models = that.getModels();

			if (!models.length) {
				return next();
			}

			let sub_tasks = [],
			    i;

			for (i = 0; i < models.length; i++) {
				let ModelClass = models[i];

				sub_tasks.push(async function doTableConfig(next) {
					await that.configureTable(ModelClass)
					next();
				});
			}

			Function.parallel(4, sub_tasks, next);
		});
	}

	return Function.series(tasks, callback);
});

/**
 * Get all model classes that connect through this datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Array}
 */
Datasource.setMethod(function getModels() {

	var result = [],
	    model,
	    all = Model.getAllChildren(),
	    i;

	for (i = 0; i < all.length; i++) {
		model = all[i];

		if (model.is_abstract) {
			continue;
		}

		if (model.prototype.dbConfig != this.name) {
			continue;
		}

		result.push(model);
	}

	return result;
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