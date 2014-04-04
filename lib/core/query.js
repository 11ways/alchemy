var util      = alchemy.use('util'),
    prefixes  = alchemy.shared('Routing.prefixes'),
    Private   = {},
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
	this.sort();

	delete this.result.options.conditions;
	delete this.result.options._conditions;
};

dbp = DbQuery.prototype;

/**
 * Process the sort options
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
dbp.sort = function sort() {

	var sort = this.findOptions.sort,
	    aliasSort = {},
	    fieldInfo,
	    key,
	    val;

	if (!sort) {
		if (this.model.sort) {
			sort = this.model.sort;
		}
	}

	// Cast to an object
	if (typeof sort !== 'object') {
		key = sort;
		sort = {};
		sort[key] = 1;
	}

	// Normalize the fields
	for (key in sort) {

		// Get the aliasmodel & field name of the given key
		fieldInfo = this.getFieldInfo(key);

		// Create an entry for this alias
		if (!aliasSort[fieldInfo.alias]) {
			aliasSort[fieldInfo.alias] = {};
		}

		// Get the current value of the sort direction
		val = String(sort[key]).toLowerCase();

		switch (val) {
			case '1':
			case 'asc':
				val = 1;
				break;

			default:
				val = -1;
		}

		// Add this field to the queryFields
		this.addQueryField(fieldInfo.field, fieldInfo.alias);

		aliasSort[fieldInfo.alias][fieldInfo.field] = val;
	}

	// If there is nothing to sort, set the property to false
	if (alchemy.isEmpty(aliasSort)) {
		sort = false;
	} else {
		sort = aliasSort;
	}

	this.result.options.sort = sort;
};

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

	// Fields needed for querying
	this.queryFields = null;

	// Only fields to return
	this.fields = null;

	this.models = {};

	// See which fields are requested
	this.compileFields();

	this.compile(conditions);

	this.result = {
		conditions: this.compiled,
		orconditions: this.or,
		fields: this.fields,
		queryFields: this.queryFields,
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

	var table,
	    aliasFields,
	    fieldKey;

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

	// If the fields to return have been limited, make sure needed fields are queried
	if (this.fields) {
		this.addQueryField(field, modelAlias);
	}

	// Any string that is 24 characters long and is a valid hex is probably an objectId
	// But just in case, we also leave in the original string
	if (typeof value == 'string' && value.length == 24 && value.isHex()) {
		value = [value, alchemy._mongoose.mongo.BSONPure.ObjectID(value)];
	}

	this.current.models[modelAlias].conditions.push({field: field, value: value});
};

/**
 * Get field info from a field path string,
 * which can contain a model name and a field chain,
 * all joined by dots
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   path    eg: AclRule.settings.halt
 *
 * @return   {Object}
 */
dbp.getFieldInfo = function getFieldInfo(path) {

	var pieces = path.split('.'),
	    modelName,
	    config,
	    first,
	    alias,
	    field;

	// Get the (possible) alias this field applies to
	first = pieces[0];

	// Cast the first piece to a model name
	modelName = first.modelName();

	// If the alias is a valid modelname, use it
	if (modelName == first || modelName.replace(/Datum$/, 'Data') == first) {
		alias = first;

		// Remove the first entry
		pieces.shift();
	} else {
		alias = this.model.modelName;
	}

	if (this.model && this.model.blueprint) {
		config = this.model.blueprint[pieces[0]];
	}

	// Construct the field path based on the rest of the array
	field = pieces.join('.');

	return {
		alias: alias,
		field: field,
		depth: pieces.length-1, // How deep we look in a field
		config: config || {}
	};
};

/**
 * See what fields the user wants to get
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
dbp.compileFields = function compileFields() {

	var that   = this,
	    fields = {};

	if (this.findOptions.fields && this.findOptions.fields.length) {
		// Go over every field entry
		this.findOptions.fields.forEach(function(fieldEntry) {
			that.addField(fieldEntry);
		});
	};
};

/**
 * Make sure the given field is queried AND returned to the client
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   field
 * @param    {String}   modelAlias   Optional
 */
dbp.addField = function addField(field, modelAlias) {

	var fieldInfo,
	    fieldName;

	if (!modelAlias) {
		fieldInfo = this.getFieldInfo(field);
		fieldName = fieldInfo.field;
		modelAlias = fieldInfo.alias;
	} else {
		fieldName = field;
	}

	// Make sure the queryFields object exists
	if (!this.fields) {
		this.fields = {};
	}

	// Make sure the queryFields entry for this alias exists
	if (!this.fields[modelAlias]) {
		this.fields[modelAlias] = {};
	}

	this.fields[modelAlias][fieldName] = 1;

	// Now add it to the query fields
	this.addQueryField(fieldName, modelAlias);
};

/**
 * Make sure the given field is queried (returned by mongo)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   field
 * @param    {String}   modelAlias   Optional
 */
dbp.addQueryField = function addQueryField(field, modelAlias) {

	var fieldInfo,
	    fieldName;

	// If no fieldlist has been set for this query, do nothing
	if (!this.fields) {
		return;
	}

	if (!modelAlias) {
		fieldInfo = this.getFieldInfo(field);
		fieldName = fieldInfo.field;
		modelAlias = fieldInfo.alias;
	} else {
		fieldName = field;
	}

	// Make sure the queryFields object exists
	if (!this.queryFields) {
		this.queryFields = {};
	}

	// Make sure the queryFields entry for this alias exists
	if (!this.queryFields[modelAlias]) {
		this.queryFields[modelAlias] = {
			'_id': 1
		};
	}

	this.queryFields[modelAlias][fieldName] = 1;
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
	    prefix,
	    entry,
	    loco,
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
			fieldInfo = this.getFieldInfo(key);

			// Get the model alias, or the current model name
			modelAlias = fieldInfo.alias || this.model.modelName;

			// Get the field name
			fieldName = fieldInfo.field;

			// If the field is translatable, look through all the prefixes
			if (!fieldInfo.depth && fieldInfo.config.translatable) {

				loco = {};

				for (prefix in prefixes) {
					loco[modelAlias + '.' + fieldName + '.' + prefix] = entry;
				}

				this.compile(loco, '$or');
			} else {
				this.add(modelAlias, fieldName, entry);
			}
		}
	}

	// End the condition group
	this.end();
};