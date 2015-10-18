/**
 * FieldType instances are created on boot,
 * so they are shared between Schema & Model instances.
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
global.FieldType = Function.inherits('Informer', function FieldType(schema, name, options) {

	var indexOptions = {};

	// The name of the field (in the schema)
	this.name = name;
	this.options = options || {};
	this.schema = schema;

	// The name of the field type
	// @todo: move to the prototype
	this.typename = this.constructor.name.beforeLast('FieldType');

	this.hasDefault = Object.hasProperty(this.options, 'default');
	this.isTranslatable = !!this.options.translatable;
	this.isObject = this.isTranslatable;
	this.isArray = !!this.options.array;

	if (this.options.alternate) {
		// Make it act like an alternate key (primary-like)
		indexOptions.alternate = true;

		// Alternate keys are always unique
		indexOptions.unique = true;
	} else if (this.options.unique) {
		indexOptions.unique = true;
	}

	// Pass along the sparse value
	indexOptions.sparse = this.options.sparse;

	if (this.options.unique) {
		this.schema.addIndex(this, indexOptions);
	}
});

/**
 * Defer casting when processing data?
 *
 * @type   {Boolean}
 */
FieldType.setProperty('deferCast', false);

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
FieldType.setMethod(function toDry() {

	var result,
	    key;

	if (this._jsonified != null) {
		return this._jsonified;
	}

	result = {};

	for (key in this) {
		result[key] = this[key];
	}

	result.title = this.title;

	return {value: result};
});

/**
 * Prepare the title property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Mixed}
 */
FieldType.prepareProperty(function title() {

	if (this.options.title) {
		return this.options.title;
	}

	return this.name.humanize();
});

/**
 * Get the path to this field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {String}
 */
FieldType.setMethod(function getPath() {
	return this.schema.getPath(this.name);
});

/**
 * Get the database value from the given record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   record
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function getRecordValue(record) {
	return Object.path(record, this.getPath());
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function cast(value) {
	return value;
});

/**
 * Cast the given value to this field's type for search in a db.
 * Allows an array of values.
 * Calls `castCondition` to do the actual casting per-value.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function castForQuery(value) {

	var result,
	    i;

	if (Array.isArray(value)) {
		result = new Array(value.length);

		for (i = 0; i < value.length; i++) {

			if (Object.isPlainObject(value[i]) && Object.keys(value[i])[0][0] == '$') {
				result[i] = value[i];
			} else {
				result[i] = this.castCondition(value[i]);
			}
		}

		result = {$in: result};
	} else {
		if (Object.isPlainObject(value) && Object.keys(value)[0][0] == '$') {
			result = value;
		} else {
			result = this.castCondition(value);
		}
	}

	return result;
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function castCondition(value) {
	return value;
});

/**
 * Prepare the value to be saved in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}        value
 * @param    {Object}       data
 * @param    {Datasource}   datasource
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function toDatasource(value, data, datasource, callback) {

	var that = this,
	    tasks;

	if (value == null) {
		return callback(null, null);
	}

	if (this.isTranslatable) {
		this.translatableToDatasource(value, data, datasource, callback);
	} else {
		this.regularToDatasource(value, data, datasource, callback);
	}
});

/**
 * The actual toDatasource method inherited fieldtype's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}        value
 * @param    {Object}       data
 * @param    {Datasource}   datasource
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function _toDatasource(value, data, datasource, callback) {
	value = this.cast(value);

	setImmediate(function() {
		callback(null, value);
	});
});

/**
 * Prepare regular values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   values
 */
FieldType.setMethod(function regularToDatasource(value, data, datasource, callback) {

	var that = this,
	    tasks;

	// Non arrayable fields are easy, only need 1 call to _toDatasource
	if (!this.isArray) {
		return this._toDatasource(value, data, datasource, callback);
	}

	// Arrayable fields need to process every value inside the array
	tasks = value.map(function eachValue(entry) {
		return function eachValueToDs(next) {
			that._toDatasource(entry, data, datasource, next);
		};
	});

	// Perform all the tasks in parallel
	Function.parallel(tasks, callback);
});

/**
 * Prepare the translatable values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   values
 */
FieldType.setMethod(function translatableToDatasource(value, data, datasource, callback) {

	var that = this,
	    tasks = {};

	Object.each(value, function eachValue(value, key) {
		tasks[key] = function doTranslateTask(next) {
			that.regularToDatasource(value, data, datasource, next);
		};
	});

	Function.parallel(tasks, callback);
});

/**
 * Prepare the value to be returned to node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}      value
 * @param    {Function}   callback
 */
FieldType.setMethod(function toApp(value, callback) {

	var that = this,
	    tasks;

	if (value == null) {
		return callback(null, null);
	}

	if (this.isTranslatable) {
		this.fromTranslatableToApp(value, callback);
	} else {
		this.fromRegularToApp(value, callback);
	}
});

/**
 * Prepare regular values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   values
 */
FieldType.setMethod(function fromRegularToApp(value, callback) {

	var that = this,
	    tasks;

	// Non-arrayable fields need only 1 call to _toApp
	if (!this.isArray) {
		return this._toApp(value, callback);
	}

	// If it is an arrayable field, make sure the value is actually an array
	if (!Array.isArray(value)) {
		value = Array.cast(value);
	}

	// Call _toApp for every value inside the array
	tasks = value.map(function eachValue(entry) {
		return function eachValueToApp(next) {
			that._toApp(entry, next);
		};
	});

	// Perform all the tasks in parallel
	Function.parallel(tasks, callback);
});

/**
 * Prepare the translatable values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   values
 */
FieldType.setMethod(function fromTranslatableToApp(value, callback) {

	var that = this,
	    tasks = {};

	Object.each(value, function eachValue(value, key) {
		tasks[key] = function doTranslateTask(next) {
			that.fromRegularToApp(value, next);
		};
	});

	Function.parallel(tasks, callback);
});

/**
 * The actual toApp method inherited fieldtype's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function _toApp(value, callback) {
	return callback(null, this.cast(value));
});

/**
 * Get the default value out of the options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function getDefault() {

	var value;

	if (!this.hasDefault) {
		return;
	}

	if (typeof this.options.default === 'function') {
		value = this.options.default();
	} else {
		value = this.options.default;
	}

	return this.getValue(this.cast(value));
});

/**
 * Get the value to store, using the given value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function getValue(value) {

	var target,
	    result,
	    temp,
	    key,
	    i;

	result = [];

	// Make sure the value is an array
	if (Array.isArray(value)) {
		// If this field is not an arrayable field, wrap it again
		if (!this.isArray) {
			temp = [value];
		} else {
			temp = value;
		}
	} else {
		temp = [value];
	}

	if (this.isObject) {
		for (i = 0; i < temp.length; i++) {

			target = {};

			if (!Object.isObject(temp[i])) {
				// Allow non-object translation values
				if (this.isTranslatable) {
					temp[i] = {'': temp[i]};
				} else {
					throw new Error('Object expected for value of field "' + this.name + '"');
				}
			}

			for (key in temp[i]) {
				if (this.deferCast) {
					target[key] = temp[i][key];
				} else {
					target[key] = this.cast(temp[i][key]);
				}
			}

			result.push(target);
		}
	} else {
		for (i = 0; i < temp.length; i++) {
			if (this.deferCast) {
				result.push(temp[i]);
			} else {
				result.push(this.cast(temp[i]));
			}
		}
	}

	if (!this.isArray) {
		return result[0];
	}

	return result;
});