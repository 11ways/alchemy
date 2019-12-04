/**
 * Field instances are created on boot,
 * so they are shared between Schema & Model instances.
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Schema}   schema      The schema this field is added to
 * @param    {String}   name        The name of the field
 * @param    {Object}   options     Field options
 */
Blast.Globals.Field = Function.inherits('Alchemy.Base', 'Alchemy.Field', function Field(schema, name, options) {

	// The name of the field (in the schema)
	this.name = name;
	this.options = options || {};
	this.schema = schema;

	// Also store under parent
	this.parent_schema = schema;

	// Check the indexes
	this.checkIndexes();
});

/**
 * Make this an abtract class
 */
Field.makeAbstractClass();

/**
 * This class starts a new group
 */
Field.startNewGroup();

/**
 * Defer casting when processing data?
 *
 * @type   {Boolean}
 */
Field.setProperty('deferCast', false);

// Set deprecated properties
Field.setDeprecatedProperty('hasDefault',            'has_default');
Field.setDeprecatedProperty('isTranslatable',        'is_translatable');
Field.setDeprecatedProperty('isObject',              'is_object');
Field.setDeprecatedProperty('isArray',               'is_array');
Field.setDeprecatedProperty('fieldTranslatable',     'is_field_translatable');
Field.setDeprecatedProperty('valueTranslatable',     'is_value_translatable');

/**
 * All children will be stored here
 *
 * @type   {Object}
 */
Field.setStatic('types', {});

/**
 * Set the datatype of this field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}
 */
Field.setStatic(function setDatatype(type) {
	this.setProperty('datatype', type);
});

/**
 * Set if the value of this field is self-contained
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Boolean}   value
 */
Field.setStatic(function setSelfContained(value) {

	if (value == null) {
		throw new Error('Field#setSelfContained(value) requires a boolean argument');
	}

	this.setProperty('is_self_contained', value);
});

/**
 * Create a PathEvaluator
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {PathEvaluator}
 */
Field.setStatic(function createPathEvaluator(path) {
	return new PathEvaluator(path);
});

/**
 * Is this a private field?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @type     {Boolean}
 */
Field.setProperty(function is_private() {
	return !!this.options.is_private;
});

/**
 * Does this field have a default value?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Field.prepareProperty(function has_default() {
	return Object.hasProperty(this.options, 'default');
});

/**
 * Is this field translatable?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Field.setProperty(function is_translatable() {
	return !!this.options.translatable;
});

/**
 * Is the entirety of this field translatable?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Field.setProperty(function is_field_translatable() {

	if (this.is_translatable) {
		return !!this.options.fieldTranslatable || !!this.options.is_field_translatable;
	}

	return false;
});

/**
 * Are the individual values of this field translatable?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Field.setProperty(function is_value_translatable() {

	if (this.is_translatable) {
		return !this.is_field_translatable;
	}

	return false;
});

/**
 * Is this field an object?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Field.setProperty(function is_object() {
	return this.is_translatable;
});

/**
 * Is this field an array?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Field.setProperty(function is_array() {
	return !!this.options.array;
});

/**
 * The datasource this field is used in
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.1.0
 *
 * @type     {Datasource}
 */
Field.setProperty(function datasource() {

	var ds_name;

	if (this.schema && this.schema.model_class) {
		ds_name = this.schema.model_class.prototype.dbConfig;
	}

	if (!ds_name) {
		ds_name = 'default';
	}

	return Datasource.get(ds_name);
});

/**
 * Set basic behaviour
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.3
 * @version  1.1.0
 */
Field.constitute(function setTitle() {

	var title = this.name,
	    type;

	if (title) {
		type = title.underscore();
		title = title.titleize();

		// Set the title on the class itself, don't let children inherit it
		this.setStatic('title', title, false);

		// Store it as a type
		Field.types[type] = this;
	}
});

/**
 * Revive a dried field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Field}
 */
Field.setStatic(function unDry(value) {

	var result = new this(value.schema, value.name, value.options);

	return result;
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Field.setMethod(function toDry() {
	return {
		value: {
			schema  : this.schema,
			name    : this.name,
			options : this.options
		}
	};
});

/**
 * Prepare the title property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @return   {Mixed}
 */
Field.setProperty(function title() {

	if (!this._title) {
		if (this.options && this.options.title) {
			this._title = this.options.title;
		} else if (this.name) {
			this._title = this.name.humanize();
		}
	}

	return this._title;
}, function setTitle(title) {
	this._title = title;
});

/**
 * Get a property by name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @param    {String}  property_name
 *
 * @return   {Mixed}
 */
Field.setMethod(function get(property_name) {
	// @TODO: add path handling
	return this[property_name];
});

/**
 * Get the path to this field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Boolean}  with_top_schema  Add top schema name, defaults to true
 *
 * @return   {String}
 */
Field.setMethod(function getPath(with_top_schema) {
	return this.schema.getPath(this.name, with_top_schema);
});

/**
 * Get the database value from the given record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Object}   record
 * @param    {String}   path_to_value_hint
 *
 * @return   {Mixed}
 */
Field.setMethod(function getRecordValue(record, path_to_value_hint) {

	var first_value,
	    some_pieces,
	    full_path,
	    new_path,
	    pieces,
	    spiece,
	    piece,
	    value,
	    path,
	    si,
	    i;

	if (path_to_value_hint) {
		value = Object.path(record, path_to_value_hint);

		if (typeof value != 'undefined') {
			return value;
		}
	}

	// Get the full path as determined by this field
	full_path = this.getPath();

	// Try getting the value
	first_value = Object.path(record, full_path);

	if (typeof first_value != 'undefined') {
		return first_value;
	}

	// Sub-sub schema fields won't be found under the full path,
	// so split off fields
	pieces = full_path.split('.');

	if (path_to_value_hint) {
		some_pieces = path_to_value_hint.split('.');
		new_path = '';
		si = 0;

		// It's possible this is in an array field, we need the path hint for that
		for (i = 0; i < pieces.length; i++) {
			piece = pieces[i];
			spiece = some_pieces[si];

			if (spiece == piece) {
				if (new_path) {
					new_path += '.';
				}

				new_path += piece;
			} else {
				// If a number was found on some_pieces, but not on pieces,
				// we need to add it to the new path and CARY ON!
				if (isNaN(piece) && !isNaN(spiece)) {
					new_path += '.' + spiece;

					// We actually decrement the regular i first,
					// because we need to do this field AGAIN!
					// si WILL increment
					i--;
				} else if (i == pieces.length - 1) {
					// If it's the last piece, just add it!
					new_path += '.' + piece;
				} else {
					new_path = null;
					break;
				}
			}

			// Also increment the some_pieces counter
			si++;
		}

		if (new_path) {
			value = Object.path(record, new_path);

			if (typeof value != 'undefined') {
				return value;
			}
		}
	}

	while (pieces.length > 1) {

		// Remove the front piece
		pieces.shift();

		// Get the new value
		value = Object.path(record, pieces);

		if (typeof value != 'undefined') {
			return value;
		}
	}

	return null;
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.7
 *
 * @param    {Mixed}     value
 * @param    {Boolean}   to_datasource   Is this meant for the datasource?
 *
 * @return   {Mixed}
 */
Field.setMethod(function cast(value, to_datasource) {
	return value;
});

/**
 * Cast the given value to this field's type for search in a db.
 * Allows an array of values.
 * Calls `castCondition` to do the actual casting per-value.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
Field.setMethod(function castForQuery(value, field_paths) {

	var result,
	    i;

	if (Array.isArray(value)) {
		result = new Array(value.length);

		for (i = 0; i < value.length; i++) {
			result[i] = this.castCondition(value[i], field_paths);
		}

		result = {$in: result};
	} else {
		result = this.castCondition(value, field_paths);
	}

	return result;
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
Field.setMethod(function castCondition(value, field_paths) {
	return this._castCondition(value);
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.0.7
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
Field.setMethod(function _castCondition(value, field_paths) {
	return this.cast(value, true);
});

/**
 * Prepare the value to be saved in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}        value
 * @param    {Object}       data
 * @param    {Datasource}   datasource
 *
 * @return   {Mixed}
 */
Field.setMethod(function toDatasource(value, data, datasource, callback) {

	var that = this;

	if (value == null) {
		return callback(null, null);
	}

	if (this.is_translatable) {
		this.translatableToDatasource(value, data, datasource, callback);
	} else {
		this.regularToDatasource(value, data, datasource, callback);
	}
});

/**
 * The actual toDatasource method inherited Field's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
Field.setMethod(function _toDatasource(value, data, datasource, callback) {
	value = this.cast(value, true);

	Blast.setImmediate(function() {
		callback(null, value);
	});
});

/**
 * Prepare regular values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   values
 */
Field.setMethod(function regularToDatasource(value, data, datasource, callback) {

	var that = this,
	    tasks;

	// Non arrayable fields are easy, only need 1 call to _toDatasource
	if (!this.is_array || this.is_value_translatable) {
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
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   values
 */
Field.setMethod(function translatableToDatasource(value, data, datasource, callback) {

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
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   query     The original query
 * @param    {Object}   options   The original query options
 * @param    {Mixed}    value     The field value, as stored in the DB
 * @param    {Function} callback
 */
Field.setMethod(function toApp(query, options, value, callback) {

	var that = this,
	    tasks;

	if (value == null) {
		return callback(null, null);
	}

	if (this.is_translatable) {
		this.fromTranslatableToApp(query, options, value, callback);
	} else {
		this.fromRegularToApp(query, options, value, callback);
	}
});

/**
 * Prepare regular values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   values
 */
Field.setMethod(function fromRegularToApp(query, options, value, callback) {

	var that = this,
	    tasks;

	// Non-arrayable fields need only 1 call to _toApp
	if (!this.is_array) {
		return this._toApp(query, options, value, callback);
	}

	// If it is an arrayable field, make sure the value is actually an array
	if (!Array.isArray(value)) {
		value = Array.cast(value);
	}

	// Call _toApp for every value inside the array
	tasks = value.map(function eachValue(entry) {
		return function eachValueToApp(next) {
			that._toApp(query, options, entry, next);
		};
	});

	// Perform all the tasks in parallel
	Function.parallel(tasks, callback);
});

/**
 * Prepare the translatable values to be returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Object}   values
 */
Field.setMethod(function fromTranslatableToApp(query, options, value, callback) {

	var that = this,
	    tasks = {};

	if (typeof value != 'object') {
		let temp = value,
		    prefix;

		if (Blast.Globals.Prefix && Blast.Globals.Prefix.default) {
			prefix = Blast.Globals.Prefix.default.locale;
		}

		if (!prefix) {
			prefix = '__';
		}

		value = {};
		value[prefix] = temp;
	}

	Object.each(value, function eachValue(value, key) {
		tasks[key] = function doTranslateTask(next) {
			that.fromRegularToApp(query, options, value, next);
		};
	});

	Function.parallel(tasks, callback);
});

/**
 * The actual toApp method inherited Field's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.7
 *
 * @param    {Object}   query     The original query
 * @param    {Object}   options   The original query options
 * @param    {Mixed}    value     The field value, as stored in the DB
 * @param    {Function} callback
 */
Field.setMethod(function _toApp(query, options, value, callback) {
	return callback(null, this.cast(value, false));
});

/**
 * Get the default value out of the options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @return   {Mixed}
 */
Field.setMethod(function getDefault() {

	var value;

	if (!this.has_default) {
		return;
	}

	if (typeof this.options.default === 'function') {
		value = this.options.default();
	} else {
		value = this.options.default;
	}

	if (value instanceof PathEvaluator) {
		value = value.getValue();
	}

	return this.getValue(this.cast(value, false));
});

/**
 * Get the value to store, using the given value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @return   {Mixed}
 */
Field.setMethod(function getValue(value) {

	var target,
	    result,
	    temp,
	    key,
	    i;

	result = [];

	// Make sure the value is an array
	if (Array.isArray(value)) {
		// If this field is not an arrayable field, wrap it again
		if (!this.is_array) {
			temp = [value];
		} else {
			temp = value;
		}
	} else {
		temp = [value];
	}

	if (this.is_object) {
		for (i = 0; i < temp.length; i++) {

			target = {};

			if (!Object.isObject(temp[i])) {
				// Allow non-object translation values
				if (this.is_translatable) {
					temp[i] = {'__': temp[i]};
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

	if (!this.is_array) {
		return result[0];
	}

	return result;
});

/**
 * See if we need to apply any indexes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Field.setMethod(function checkIndexes() {

	var index = {};

	if (this.options.alternate) {
		// Make it act like an alternate key (primary-like)
		index.alternate = true;

		// Alternate keys are always unique
		index.unique = true;
	} else if (this.options.unique) {
		index.unique = true;
	}

	// Pass along the sparse value
	if (this.options.sparse != null) {
		index.sparse = this.options.sparse;
	}

	if (this.options.unique) {
		this.schema.addIndex(this, index);
	} else if (!Object.isEmpty(index)) {
		console.log('@TODO: handle field index:', this, index);
	}
});

/**
 * Class that evaluates a path
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path
 */
var PathEvaluator = Function.inherits(null, 'Alchemy', function PathEvaluator(path) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	this.path = path;
});

/**
 * Undry the value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setStatic(function unDry(value) {
	return new PathEvaluator(value.path);
});

/**
 * Create a dry object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setMethod(function toDry() {
	return {
		value: {
			path : this.path
		}
	};
});

/**
 * Get the actual value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setMethod(function getValue() {

	var context = Blast.Globals,
	    result = Object.path(context, this.path);

	if (typeof result == 'function') {
		result = result();
	}

	return result;
});