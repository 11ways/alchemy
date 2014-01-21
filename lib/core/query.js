var util    = require('util'),
    Private = {},
    dbp;

/**
 * The DbQuery class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Model}     model         The originating model instance
 * @param    {Object}    findOptions   The original find options
 */
global.DbQuery = function DbQuery(model, findOptions) {

	this.model = model;
	this.findOptions = findOptions;

	this.result = null;
	this.process();

	this.result.options = alchemy.cloneSafe(findOptions);

	delete this.result.options.conditions;
	delete this.result.options._conditions;
};

dbp = DbQuery.prototype;

/**
 * Create a query based on query options
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
dbp.process = function process() {

	var conditions = this.findOptions.conditions;

	this.compiled = null;
	this.current = null;
	this.or = null;
	this.models = {};

	this.compile(conditions);

	this.result = {
		conditions: this.compiled,
		orconditions: this.or,
		main: this.model.modelName.tableize(),
		mainAlias: this.model.modelName,
		results: this.models
	};
};

/**
 * Begin a new query group
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   type   The type of this group: $or, $and, $not
 */
dbp.begin = function begin(type) {

	var current = {
		type: type,
		models: {}
	};

	// When we get to the first $or, we split up the groups
	if (type == '$or' && !this.or) {
		this.or = current;
	} else {
		// Store the new condition group under the old one
		if (this.current) {
			current.parent = this.current;
			this.current.next = current;
		} else {
			// If it doesn't exist yet, store it under compiled
			this.compiled = current;
		}
	}

	// Change the current pointer
	this.current = current;
};

/**
 * End a query group
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
dbp.end = function end() {

	var old;

	if (this.current.parent) {
		old = this.current;
		this.current = this.current.parent;
		delete old.parent;
	}
};

/**
 * Add a condition to the current processing condition group
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   modelAlias   The table alias
 * @param    {String}   field        The field name
 * @param    {Mixed}    value        The value the field should be
 *
 * @return   {undefined}
 */
dbp.add = function add(modelAlias, field, value) {

	var table;

	// Indicate this model alias should be queried
	this.models[modelAlias] = null;

	// Get the table name for this alias
	// @todo: this will only work for associations in the current model,
	// not for associations of associations!
	if (this.model.aliasAssociations[modelAlias] && this.model.aliasAssociations[modelAlias].modelName) {
		table = this.model.aliasAssociations[modelAlias].modelName.tableize();
	} else {
		table = modelAlias.tableize();
	}

	if (!this.current.models[modelAlias]) {
		this.current.models[modelAlias] = {
			conditions: [],
			alias: modelAlias,
			table: table
		};
	}

	// Any string that is 24 characters long and is a valid hex is probably an objectId
	// But just in case, we also leave in the original string
	if (typeof value == 'string' && value.length == 24 && value.isHex()) {
		value = [value, alchemy._mongoose.mongo.BSONPure.ObjectID(value)];
	}

	this.current.models[modelAlias].conditions.push({field: field, value: value});
};

/**
 * Compile the given conditions
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   conditions
 * @param    {String}   type
 *
 * @return   {undefined}
 */
dbp.compile = function compile(conditions, type) {

	var modelAlias,
	    fieldInfo,
	    fieldName,
	    keytype,
	    entry,
	    key,
	    obj;

	if (typeof type == 'undefined') type = '$and';

	// Begin a new condition group
	this.begin(type);

	for (key in conditions) {
		entry = conditions[key];
		keytype = key.toLowerCase();

		// Recursively compile subgroups
		if (keytype == '$or' || keytype == '$and') {
			this.compile(entry, keytype);
		} else {

			// Interpret Model.field strings
			fieldInfo = key.deplugin();

			// Get the model alias, or the current model name
			modelAlias = fieldInfo.model || this.model.modelName;

			// Get the field name
			fieldName = fieldInfo.field;

			// Add the condition
			this.add(modelAlias, fieldName, entry);
		}
	}

	// End the condition group
	this.end();
};