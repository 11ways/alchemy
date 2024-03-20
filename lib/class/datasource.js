var instances = {};

/**
 * Datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Blast.Globals.Datasource = Function.inherits('Alchemy.Base', 'Alchemy.Datasource', function Datasource(name, options) {

	this.name = name;

	this.options = Object.assign(this.options || {}, options);
});

/**
 * Make this an abtract class
 */
Datasource.makeAbstractClass();

/**
 * This class starts a new group
 */
Datasource.startNewGroup();

/**
 * Enable query caching according to settings
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 */
Datasource.setProperty(function queryCache() {

	if (Blast.isBrowser) {
		return true;
	}

	return !!alchemy.settings.data_management.model_query_cache_duration;
});

/**
 * Set support flag for something
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {string}   name
 * @param    {boolean}  value
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {string}   name
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {string}   name
 *
 * @return   {boolean}
 */
Datasource.setMethod(function supports(name) {
	return this.constructor.supports(name);
});

/**
 * Allow a specific action?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   name
 *
 * @return   {boolean}
 */
Datasource.setMethod(function allows(name) {

	if (this.options[name] === false) {
		return false;
	}

	let method_name = '_' + name;

	// If the original read/create/remove method is still used, return false
	if (this[method_name] === Datasource.prototype[method_name]) {
		return false;
	}

	return true;
});

/**
 * Convert the given value to a BigInt (for use in JS)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {*}   value
 *
 * @return   {BigInt}
 */
Datasource.setMethod(function castToBigInt(value) {

	if (value == null) {
		return value;
	}

	return BigInt(value);
});

/**
 * Convert the given value from a BigInt (for use in DB)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {BigInt}   value
 *
 * @return   {BigInt}
 */
Datasource.setMethod(function convertBigIntForDatasource(value) {

	if (value == null) {
		return value;
	}

	return BigInt(value);
});

/**
 * Convert the given value to a Decimal (for use in JS)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {*}   value
 *
 * @return   {BigInt}
 */
Datasource.setMethod(function castToDecimal(value) {

	if (value == null) {
		return value;
	}

	return new Blast.Classes.Develry.Decimal(value);
});

/**
 * Convert the given decimal for use in DB
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Decimal|string}   value
 *
 * @return   {Decimal}
 */
Datasource.setMethod(function convertDecimalForDatasource(value) {

	if (value == null) {
		return value;
	}

	return new Blast.Classes.Develry.Decimal(value);
});

/**
 * Hash a string synchronously
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.5
 *
 * @param    {string}   str
 *
 * @return   {string}
 */
Datasource.setMethod(function hashString(str) {
	return alchemy.checksum(str);
});

/**
 * Get a schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Schema}   schema
 *
 * @return   {Schema}
 */
Datasource.setMethod(function getSchema(schema) {
	if (schema != null) {
		let is_schema;

		is_schema = schema instanceof Blast.Classes.Alchemy.Client.Schema;

		if (!is_schema && Blast.Classes.Alchemy.Schema) {
			is_schema = schema instanceof Blast.Classes.Alchemy.Schema;
		}

		if (!is_schema) {
			schema = getSchema(schema.schema);
		}
	}

	return schema;
});

/**
 * Prepare record to be stored in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         data
 *
 * @return   {Pledge<Object>|Object}
 */
Datasource.setMethod(function toDatasource(schema, data) {

	// Make sure we get the schema
	schema = this.getSchema(schema);

	if (Object.isPlainObject(schema)) {
		throw new Error('The provided schema was a regular object');
	}

	if (!schema) {
		if (alchemy.settings.debugging.debug) {
			alchemy.distinctProblem('schema-not-found', 'Schema not found: not normalizing data');
		}

		return data;
	}

	let that = this,
	    tasks = {};

	data = {...data};

	for (let field_name in data) {
		let field = schema.get(field_name);

		if (field != null) {
			let value = data[field_name];

			tasks[field_name] = function doToDatasource(next) {
				that.valueToDatasource(field, value, data, next);
			};
		}
	}

	return Pledge.Swift.parallel(tasks);
});

/**
 * Prepare to return the record from the database to the app
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         query
 * @param    {Object}         options
 * @param    {Object}         data
 *
 * @return   {Pledge<*>|*}
 */
Datasource.setMethod(function toApp(schema, query, options, data) {

	if (!data) {
		throw new Error('Unable to convert data: no data given');
	}

	let that = this;

	schema = this.getSchema(schema);

	if (schema == null) {
		alchemy.distinctProblem('schema-not-found-unnormalize', 'Schema not found: not un-normalizing data');
		return data;
	}

	options = {...options};

	if (!options._root_data) {
		options._root_data = data;
	}

	let tasks;

	if (data[schema.name]) {
		tasks = {};

		for (let key in data) {
			let value = data[key],
			    data_schema;

			if (key == schema.name) {
				data_schema = schema;
			} else {
				let info = schema.associations[key];

				// Ignore associations we know nothing of
				if (!info) {
					continue;
				}

				let model = this.getModel(info.modelName, false);

				if (!model) {
					continue;
				}

				data_schema = model.schema;
			}

			tasks[key] = function addData(next) {

				// Associated data can return multiple items, so we need to unwind that
				if (Array.isArray(value)) {
					let sub_tasks = [],
					    i;

					for (i = 0; i < value.length; i++) {
						let row = value[i];
						sub_tasks.push(function doRow(next) {
							Pledge.Swift.done(that.toApp(data_schema, query, options, row), next);
						});
					}

					Function.parallel(false, 4, sub_tasks, next);
				} else {
					Pledge.Swift.done(that.toApp(data_schema, query, options, value), next);
				}
			};
		}

		return Pledge.Swift.parallel(tasks);
	}

	data = {...data};
	tasks = {};

	for (let entry of schema.getSortedItems()) {

		let field_name = entry.key,
		    field = entry.value,
		    value = data[field_name];

		if (field.is_meta_field) {
			continue;
		}

		if (field != null) {
			tasks[field_name] = function doToDatasource(next) {
				that.valueToApp(field, query, options, value, next);
			};
		}
	}

	if (Blast.isBrowser) {
		for (let key in data) {
			if (key[0] == '_' && key[1] == '$') {
				// Certain extra data is stored on the browser as
				// properties starting with "_$"
				tasks[key] = function addExtraneous(next) {
					next(null, data[key]);
				};
			}
		}
	}

	return Pledge.Swift.parallel(tasks);
});

/**
 * Prepare value to be stored in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Datasource.setMethod(function _valueToDatasource(field, value, data, callback) {
	callback(null, value);
});

/**
 * Prepare value to be returned to the app.
 * Should be overridden by extended datasources.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Datasource.setMethod(function _valueToApp(field, query, options, value, callback) {
	callback(null, value);
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
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
		hash = 'criteria-' + alchemy.checksum(criteria);

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

	let cache_pledge;

	if (hash && model.cache && this.queryCache) {
		cache_pledge = new Pledge();
	}

	model.emit('reading_datasource', criteria);

	// Nothing in the cache, so do the actual reading
	that._read(model, criteria, function afterRead(err, results, available) {

		var sub_pledge,
		    tasks,
		    i;

		model.emit('read_datasource', criteria);

		if (err) {
			return pledge.reject(err);
		}

		if (criteria.options.return_raw_data) {
			criteria.setOption('document', false);
			return handleResults(null, results);
		}

		tasks = results.map(function eachEntry(entry) {
			return function entryToApp(next) {
				Pledge.Swift.done(that.toApp(model, criteria, {}, entry), next);
			};
		});

		sub_pledge = Function.parallel(tasks, handleResults);

		pledge._addProgressPledge(sub_pledge);

		function handleResults(err, app_results) {

			if (err) {
				return pledge.reject(err);
			}

			try {

				let result = {
					items     : app_results,
					available : available
				};

				if (hash) {

					// Emit the storing_cache event
					model.emit('storing_cache', criteria, result);

					let cloned = JSON.clone(result);

					model.emit('stored_cache', criteria, cloned);

					cache_pledge.resolve(cloned);
				}

				pledge.resolve(result);
			} catch (err) {
				pledge.reject(err);
			}
		}
	});

	if (this.queryCache && model.cache && cache_pledge) {
		// Store the pledge in the cache
		model.cache.set(hash, cache_pledge);
	}

	return pledge;
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
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
		Pledge.Swift.done(that.toDatasource(model, data), next);
	}, function emitToDatasource(next, ds_data) {
		model.emit('to_datasource', data, ds_data, options, true, function afterTDSevent(err, stopped) {
			next(err, ds_data);
		});
	}, function doCreate(next, ds_data) {
		that._create(model, ds_data, options, next);
	}, function gotUpdateResult(next, result) {
		Pledge.Swift.done(that.toApp(model, null, options, result), next);
	}, function done(err, result) {

		if (err) {
			return;
		}

		return result.last() || false;
	});

	pledge.done(callback);

	return pledge;
});

/**
 * Update data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
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
		Pledge.Swift.done(that.toDatasource(model, data), next);
	}, function emitToDatasource(next, ds_data) {
		model.emit('to_datasource', data, ds_data, options, false, function afterTDSevent(err, stopped) {
			next(err, ds_data);
		});
	}, function doUpdate(next, ds_data) {
		that._update(model, ds_data, options, next);
	}, function gotUpdateResult(next, result) {

		if (!result) {
			return next();
		}

		Pledge.Swift.done(that.toApp(model, null, options, result), next);
	}, function done(err, result) {

		if (err) {
			return;
		}

		return result.last() || false;
	});

	pledge.done(callback);

	return pledge;
});

/**
 * Remove data from the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function remove(model, query, options, callback) {
	this._remove(model, query, options, callback);
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Model}     model
 * @param    {Object}    data
 * @param    {Object}    options
 * @param    {Function}  callback
 *
 * @return   {Pledge}
 */
Datasource.setMethod(function _create(model, data, options, callback) {
	return this.createRejectedPledge('_create', callback);
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _read(model, query, options, callback) {
	return this.createRejectedPledge('_read', callback);
});

/**
 * Update data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _update(model, data, options, callback) {
	return this.createRejectedPledge('_update', callback);
});

/**
 * Remove data from the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _remove(model, query, options, callback) {
	return this.createRejectedPledge('_remove', callback);
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Datasource.setMethod(function _ensureIndex(model, index, callback) {
	return this.createRejectedPledge('_ensureIndex', callback);
});

/**
 * Return a rejected pledge
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Datasource.setMethod(function createRejectedPledge(method, callback) {
	var pledge = Pledge.reject(new Error(method + ' method was not defined for ' + this.constructor.name + ' "' + this.name + '"'));
	pledge.done(callback);
	return pledge;
});

/**
 * Setup the datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

		if (model.prototype.dbConfig != this.name) {
			continue;
		}

		if (this.isAbstractModel(model)) {
			continue;
		}

		result.push(model);
	}

	return result;
});

/**
 * Is the given model an abstract model?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Function}   model
 *
 * @return   {boolean}
 */
Datasource.setMethod(function isAbstractModel(model) {
	return !!model.is_abstract;
});

/**
 * Create a new datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {string}   type      The type of datasource to create
 * @param    {string}   name      The internal name of the datasource
 * @param    {Object}   options   Configuration options for the datasource
 *
 * @return   {Datasource}
 */
Datasource.create = function create(type, name, options) {

	var constructor = Datasource.getMember(type);

	if (!constructor) {
		throw new Error('Datasource type "' + type + '" does not exist');
	}

	let instance = new constructor(name, options);
	instances[name] = instance;

	return instance;
};

/**
 * Get a datasource instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @return   {Datasource}
 */
Datasource.get = function get(name) {

	var ds;

	if (!arguments.length) {
		return instances;
	}

	if (typeof name == 'string') {
		ds = instances[name];
	} else if (name instanceof Datasource) {
		ds = name;
	} else if (name) {

		if (!name.type) {
			throw new Error('Unable to create Datasource without a type');
		}

		if (!name.name) {
			throw new Error('Unable to create Datasource without giving it a name');
		}

		ds = Datasource.create(name.type, name.name, name.options || name);
	} else {
		throw new Error('Wrong arguments passed to Datasource.get()');
	}

	return ds;
};