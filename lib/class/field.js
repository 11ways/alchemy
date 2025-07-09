const CASTER = Symbol('caster');

/**
 * Field instances are created on boot,
 * so they are shared between Schema & Model instances.
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.6
 *
 * @param    {Schema}   schema      The schema this field is added to
 * @param    {string}   name        The name of the field
 * @param    {Object}   options     Field options
 */
Blast.Globals.Field = Function.inherits('Alchemy.Base', 'Alchemy.Field', function Field(schema, name, options) {

	// The name of the field (in the schema)
	this.name = name;
	this.options = options || {};
	this.schema = schema;

	// Also store under parent
	this.parent_schema = schema;

	if (schema) {
		// Check the indexes
		// @TODO: move this to the `addField` methods?
		this.checkIndexes();
	}
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
 * @type     {boolean}
 */
Field.setProperty('deferCast', false);

// Set deprecated properties
Field.setDeprecatedProperty('hasDefault',            'has_default');
Field.setDeprecatedProperty('isTranslatable',        'is_translatable');
Field.setDeprecatedProperty('isObject',              'is_object');
Field.setDeprecatedProperty('isArray',               'is_array');

/**
 * All children will be stored here
 *
 * @type     {Object}
 */
Field.setStatic('types', {});

/**
 * Set the main cast function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Function}   fnc
 */
Field.setStatic(function setCastFunction(fnc) {
	this.setMethod(CASTER, fnc);
});

/**
 * Set the datatype of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}
 */
Field.setStatic(function setDatatype(type) {
	this.setProperty('datatype', type);
});

/**
 * Set if the value of this field is self-contained
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {boolean}   value
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {PathEvaluator}
 */
Field.setStatic(function createPathEvaluator(path) {
	return new Classes.Alchemy.PathEvaluator(path);
});

/**
 * Fields are not meta fields by default.
 * Meta fields do not actually exist in the database.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Boolean}
 */
Field.setProperty('is_meta_field', false);

/**
 * Get the description of the field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {string}
 */
Field.setProperty(function description() {
	return this.options?.description || this.options?.options?.description || null;
});

/**
 * Is this a private field?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.2.4
 *
 * @type     {boolean}
 */
Field.setProperty(function is_private() {

	if (this.options.is_private || this.options.private) {
		return true;
	}

	return false;
});

/**
 * Does this field have a default value?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Field.prepareProperty(function has_default() {
	return Object.hasProperty(this.options, 'default');
});

/**
 * Is this field translatable, meaning:
 * it is an object with the locales as keys.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Field.setProperty(function is_translatable() {
	return !!this.options.translatable;
});

/**
 * Does this field need to be translated in some way?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.1.4
 *
 * @type     {boolean}
 */
Field.setProperty(function requires_translating() {
	return this.is_translatable;
});

/**
 * Is this field an object?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Field.setProperty(function is_object() {
	return this.is_translatable;
});

/**
 * Is this field an array?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Field.setProperty(function is_array() {

	let result = this.options.is_array;

	if (!result) {
		result = this.options.array;
	}

	return !!result;
});

/**
 * Does this field have a computed value?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @type     {boolean}
 */
Field.setProperty(function is_computed() {
	return !!this.options.is_computed;
});

/**
 * Should this field allow null values?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {boolean}
 */
Field.setProperty(function is_nullable() {
	return !(this.options.is_nullable === false);
});

/**
 * Get the required related fields
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @type     {Field[]}
 */
Field.enforceProperty(function required_fields(new_value) {

	if (!new_value) {
		new_value = resolveFieldPaths(this, this.options.required_fields);
	}

	return new_value;
});

/**
 * Get the optional related fields
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @type     {Field[]}
 */
Field.enforceProperty(function optional_fields(new_value) {

	if (!new_value) {
		new_value = resolveFieldPaths(this, this.options.optional_fields);
	}

	return new_value;
});

/**
 * Get all the dependency fields
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @type     {Field[]}
 */
Field.enforceProperty(function dependency_fields(new_value) {

	if (!new_value) {
		let required_fields = this.required_fields,
		    optional_fields = this.optional_fields;

		new_value = [];

		if (required_fields) {
			new_value = new_value.concat(required_fields);
		}

		if (optional_fields) {
			new_value = new_value.concat(optional_fields);
		}
	}

	return new_value;
});

/**
 * Resolve a field path to a field instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
function resolveFieldPaths(field, field_paths) {
	
	let result = [],
	    i;

	if (!field_paths) {
		return result;
	}

	for (i = 0; i < field_paths.length; i++) {

		if (!field.parent_schema) {
			continue
		}

		let other_field = field.parent_schema.getField(field_paths[i]);

		if (other_field && result.indexOf(other_field) == -1) {
			result.push(other_field);
		}
	}

	return result;
}

/**
 * The datasource this field is used in
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Get the path to this field in the main record
 * (Without name of the model)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
Field.setProperty(function path() {
	return this.schema.getPath(this.name, false);
});

/**
 * Get the path to this field in the document
 * (WITH the name of the model)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
Field.setProperty(function path_in_document() {
	return this.schema.getPath(this.name, true);
});

/**
 * Set basic behaviour
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.1
 *
 * @return   {Object}
 */
Field.setMethod(function toDry() {
	return {
		value: {
			bla: 1,
			schema  : this.schema,
			name    : this.name,
			options : this.getOptionsForDrying(),
		}
	};
});

/**
 * Prepare the title property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @param    {string}  property_name
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
 * @deprecated
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {boolean}  with_top_schema  Add top schema name, defaults to true
 *
 * @return   {string}
 */
Field.decorateMethod('deprecate', function getPath(with_top_schema) {
	return this.schema.getPath(this.name, with_top_schema);
});

/**
 * Get all the fields that lead to this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Field[]}
 */
Field.setMethod(function getFieldChain() {
	return this.schema.root_schema.getFieldChain(this.path);
});

/**
 * Get all the values for the current field in the given document
 * as an array of FieldValue instances
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Document}   document   The root document to get the values from
 *
 * @return   {FieldValue[]}
 */
Field.setMethod(function getDocumentValues(document) {

	let fields = this.getFieldChain(),
	    first = fields[0],
	    fv;

	fv = new Classes.Alchemy.FieldValue(first, first.name, document[first.name]);

	return fv.refine(fields.slice(1));
});

/**
 * Get the database value from the given record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Object}   record
 * @param    {string}   path_to_value_hint
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
	full_path = this.path_in_document;

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
 * Cast the value (could be in a container)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}         value
 * @param    {boolean}   to_datasource   Is this meant for the datasource?
 *
 * @return   {*}
 */
Field.setMethod(function castContainedValues(value, to_datasource) {

	if (this.is_translatable && value && this.is_translatable) {
		let prefix;

		for (prefix in value) {
			value[prefix] = this.cast(value[prefix], to_datasource);
		}
	} else if (this.is_array && value) {
		let i;

		for (i = 0; i < value.length; i++) {
			value[i] = this.cast(value[i], to_datasource);
		}
	} else {
		value = this.cast(value, to_datasource);
	}

	return value;
});

/**
 * Cast the given value to this field's type.
 * Containers should not be passed (like the array or translation object container)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {*}         value
 * @param    {boolean}   to_datasource   Is this meant for the datasource?
 *
 * @return   {*}
 */
Field.setMethod(function cast(value, to_datasource) {

	if (value === '' && this.datatype !== 'string') {
		value = null;
	}

	if (value == null && this.is_nullable) {
		return null;
	}

	return this[CASTER](value, to_datasource);
});

/**
 * Default cast function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}         value
 * @param    {boolean}   to_datasource   Is this meant for the datasource?
 *
 * @return   {*}
 */
Field.setCastFunction(function defaultCast(value, to_datasource) {
	return value;
});

/**
 * Cast the given value if it doesn't need to be deferred
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 *
 * @param    {Mixed}     value
 * @param    {boolean}   to_datasource   Is this meant for the datasource?
 *
 * @return   {Mixed}
 */
Field.setMethod(function _initialValueCast(value, to_datasource) {

	if (!this.deferCast) {
		value = this.cast(value, to_datasource);
	}

	return value;
});

/**
 * Cast the given value to this field's type for search in a db.
 * Allows an array of values.
 * Calls `castCondition` to do the actual casting per-value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
Field.setMethod(function castForQuery(value, field_paths) {

	let result;

	if (Array.isArray(value)) {
		result = new Array(value.length);

		for (let i = 0; i < value.length; i++) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.2.0
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
Field.setMethod(function _castCondition(value, field_paths) {

	// Always allow regex values, we'll use those in the projection stage
	if (value && RegExp.isRegExp(value)) {
		return value;
	}

	return this.cast(value, true);
});

/**
 * Prepare the value to be saved in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 *
 * @return   {*}
 */
Field.setMethod(function toDatasource(context) {

	let value = context.getFieldValue();

	if (value == null) {
		return null;
	}

	if (this.is_translatable) {
		return this.translatableToDatasource(context, value);
	}

	return this.regularToDatasource(context, value);
});

/**
 * The actual toDatasource method inherited Field's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Field.setMethod(function _toDatasource(context, value) {
	return this.cast(value, true);
});

/**
 * Prepare regular values to be returned
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Field.setMethod(function regularToDatasource(context, value) {

	// Non arrayable fields are easy, only need 1 call to _toDatasource
	if (!this.is_array) {
		return this._toDatasource(context, value);
	}

	if (!value) {
		return value;
	}

	let tasks = value.map(entry => this._toDatasource(context.withWorkingValue(entry), entry));

	return Pledge.Swift.parallel(tasks);
});

/**
 * Prepare the translatable values to be returned
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<Object>|Object}
 */
Field.setMethod(function translatableToDatasource(context, value) {

	let tasks = {};

	for (let key in value) {
		let sub_value = value[key];
		tasks[key] = this.regularToDatasource(context.withWorkingValue(sub_value), sub_value);
	}

	return Pledge.Swift.parallel(tasks);
});

/**
 * Prepare the value to be returned to node
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 *
 * @return   {*}
 */
Field.setMethod(function toApp(context) {

	let value = context.getFieldValue();

	if (value == null) {
		return null;
	}

	if (this.is_translatable) {
		return this.fromTranslatableToApp(context, value);
	} else {
		return this.fromRegularToApp(context, value);
	}
});

/**
 * Prepare regular values to be returned
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Field.setMethod(function fromRegularToApp(context, value) {

	// Non-arrayable fields need only 1 call to _toApp
	if (!this.is_array) {
		return this._toApp(context, value);
	}

	// If it is an arrayable field, make sure the value is actually an array
	if (!Array.isArray(value)) {
		value = Array.cast(value);
		context.setWorkingValue(value);
	}

	let tasks = value.map(entry => this._toApp(context.withWorkingValue(entry), entry));

	return Pledge.Swift.parallel(tasks);
});

/**
 * Prepare the translatable values to be returned
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Field.setMethod(function fromTranslatableToApp(context, value) {

	if (typeof value != 'object') {
		let temp = value,
		    prefix;

		if (Blast.Globals.Prefix && Blast.Globals.Prefix.default) {
			prefix = Blast.Globals.Prefix.default.locale;
		}

		if (!prefix) {
			prefix = '__';
		}

		value = {[prefix]: temp};
	}

	let tasks = {};

	for (let key in value) {
		let sub_value = value[key];
		tasks[key] = this.fromRegularToApp(context.withWorkingValue(sub_value), sub_value);
	}

	return Pledge.Swift.parallel(tasks);
});

/**
 * The actual toApp method inherited Field's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Field.setMethod(function _toApp(context, value) {
	return this.cast(value, false);
});

/**
 * Get the default value out of the options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

	if (value instanceof Classes.Alchemy.PathEvaluator) {
		value = value.getValue();
	}

	return this.getValue(this.cast(value, false));
});

/**
 * Get the value to store, using the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.5
 *
 * @return   {Mixed}
 */
Field.setMethod(function getValue(value) {

	var wrapped;

	// Make sure the value is an array
	if (Array.isArray(value)) {
		// If this field is not an arrayable field, wrap it again
		if (!this.is_array) {
			wrapped = [value];
		} else {
			wrapped = value;
		}
	} else {
		wrapped = [value];
	}

	let result = this._getValue(wrapped);

	if (!this.is_array || this.is_array && this.is_translatable) {
		result = result[0];
	}

	return result;
});


/**
 * Get the value to store, using the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Array}   wrapped
 */
Field.setMethod(function _getValue(wrapped, done_translation) {

	let result = [],
	    i;

	if (this.is_translatable && !done_translation) {

		let target,
		    entry,
		    key;

		for (i = 0; i < wrapped.length; i++) {

			entry = wrapped[i];
			target = {};

			if (!Object.isObject(entry)) {
				// Allow non-object translation values
				wrapped[i] = entry = {__: entry};
			}

			for (key in entry) {

				if (this.is_array) {
					target[key] = this._getValue(entry[key], true);
				} else {
					target[key] = this._initialValueCast(entry[key]);
				}
			}

			result.push(target);
		}
	} else if (wrapped?.length) {
		for (i = 0; i < wrapped.length; i++) {
			result.push(this._initialValueCast(wrapped[i]));
		}
	}

	return result;
});

/**
 * See if we need to apply any indexes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.6
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

	if (this.options.unique && this.schema) {
		this.schema.addIndex(this, index);
	} else if (!Object.isEmpty(index)) {
		console.log('@TODO: handle field index:', this, index);
	}
});

/**
 * Make a client-side safe clone of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Schema}
 */
Field.setMethod(function toHawkejs(wm) {

	let schema = JSON.clone(this.schema, 'toHawkejs', wm),
	    options = this.getClientConfigOptions(wm);

	return new this.constructor(schema, this.name, options);
});

/**
 * Get the client-side options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
Field.setMethod(function getClientConfigOptions(wm) {
	return JSON.clone(this.options, 'toHawkejs', wm);
});

/**
 * Get the options that can be used for drying
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Object}
 */
Field.setMethod(function getOptionsForDrying() {
	return this.options;
});

/**
 * Get all the rules for this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Array}
 */
Field.setMethod(function getRules() {

	var result = [],
	    rule;

	for (rule of this.schema.rules) {

		if (rule.appliesToField(this)) {
			result.push(rule);
		}
	}

	return result;
});

/**
 * See if the given vlaue is considered not-empty for this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.7
 * @version  1.3.7
 *
 * @param    {Mixed}   value
 *
 * @return   {boolean}
 */
Field.setMethod(function valueHasContent(value) {

	if (value == null) {
		return false;
	}

	if (value === '') {
		return false;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return false;
		}
	}

	return true;
});

/**
 * Translate the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.2.5
 */
Field.setMethod(function translateRecord(prefixes, record, allow_empty) {

	let found = alchemy.pickTranslation(prefixes, record[this.name], allow_empty);

	// Use the final result, if we found something or not
	record[this.name] = found.result;
	record['_prefix_' + this.name] = found.prefix;

	if (!record.$translated_fields) {
		record.$translated_fields = {};
	}

	record.$translated_fields[this.name] = found.prefix;
});