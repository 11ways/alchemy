var instances = {},
    hash = alchemy.use('murmurhash3').murmur128HexSync;

/**
 * Datasource
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
global.Datasource = Function.inherits(function Datasource(name, options) {

	this.name = name;

	this.options = Object.assign(this.options, options);
});

/**
 * Enable query caching by default
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setProperty('queryCache', true);

/**
 * Hash a string synchronously
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   str
 *
 * @return   {String}
 */
Datasource.setMethod(function hashString(str) {
	return hash(str);
});

/**
 * Prepare record to be stored in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         data
 */
Datasource.setMethod(function toDatasource(schema, data, callback) {

	var that = this,
	    fieldName,
	    field,
	    tasks;

	if (schema != null && !(schema instanceof alchemy.classes.Schema)) {
		schema = schema.blueprint || schema.schema;
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Schema|Model}   schema
 * @param    {Object}         data
 */
Datasource.setMethod(function toApp(schema, data) {

	var fieldName,
	    field;

	if (!(schema instanceof alchemy.classes.Schema)) {
		schema = schema.blueprint || schema.schema;
	}

	if (schema == null) {
		throw new Error('Illegal schema provided');
	}

	data = Object.assign({}, data);

	for (fieldName in data) {
		field = schema.get(fieldName);

		if (field != null) {
			data[fieldName] = this.valueToApp(field, data[fieldName]);
		}
	}

	return data;
});

/**
 * Prepare value to be stored in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function valueToApp(field, value) {

	value = field.toApp(value);

	return this._valueToApp(field, value);
});

/**
 * Prepare value to be stored in the database.
 * Should be overridden by extended datasources.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function _valueToApp(field, value) {
	return value;
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function read(model, query, options, callback) {

	var that = this,
	    cacheResult,
	    serialized,
	    result;

	// Serialize the query conditions to a string, using JSON-dry
	if (this.queryCache && model.cache) {
		serialized = 'query-' + hash(alchemy.stringify({query: query, options: options}));

		cacheResult = model.cache.get(serialized, true);

		if (cacheResult != null) {
			setImmediate(function returnCache() {

				// Parse the JSON-dry string
				result = alchemy.parse(cacheResult.items);

				// Return the results
				callback(null, result, cacheResult.available);
			});

			return;
		}
	}

	// Cache is disabled or not found: perform the query
	this._read(model, query, options, function afterRead(err, results, available) {

		var i;

		if (err != null) {
			return callback(err);
		}

		for (i = 0; i < results.length; i++) {
			results[i] = that.toApp(model, results[i]);
		}

		if (serialized != null) {
			model.cache.set(serialized, {items: alchemy.stringify(results), available: available});
		}

		callback(null, results, available);
	});
});

/**
 * Update data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function remove(model, query, options, callback) {
	this._remove(model, query, options, callback);
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function _create(model, data, options, callback) {
	throw new Error('Create method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function _read(model, query, options, callback) {
	throw new Error('Read method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Update data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function _update(model, data, options, callback) {
	throw new Error('Update method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Remove data from the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.setMethod(function _remove(model, query, options, callback) {
	throw new Error('Remove method was not defined for ' + this.constructor.name + ' "' + this.name + '"');
});

/**
 * Create a new datasource
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.create = function create(type, name, options) {

	var className = type.classify() + 'Datasource',
	    instance;

	if (!alchemy.classes[className]) {
		throw new Error('Datasource type "' + type + '" does not exist');
	}

	instance = new alchemy.classes[className](name, options);
	instances[name] = instance;

	return instances;
};

/**
 * Get a datasource instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.get = function get(name) {
	return instances[name];
};