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

dbp.end = function end() {

	var old;

	if (this.current.parent) {
		old = this.current;
		this.current = this.current.parent;
		delete old.parent;
	}
};

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

	this.current.models[modelAlias].conditions.push({field: field, value: value});
};

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

/**
 * Create a query based on query options
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
DbQuery.prototype.oldprocess = function process() {

	// Compile the conditions, wrap everything in an $and (which is implied anyway)
	var compiled = this.compileConditions(this.findOptions.conditions);
	
	this.findOptions._conditions = compiled;
	this.findOptions._currentModel = this.model.modelName.underscore().pluralize();
	
	this.result = this.findOptions;
};

/**
 * Normalize the user defined query,
 * so our stored procedure on the MongoDB server can execute it
 *
 * @param    {Object}   query       The query to compile
 * @param    {Object}   options     Some options
 * @param    {String}   findScope   The scope of this level ($and or $or)
 * @param    {integer}  level       How deep we are
 *
 * @returns  {array}    First entry = info, others are conditions
 */
DbQuery.prototype.compileConditions = function compileConditions(query, options, findScope, level) {
	if (typeof options == 'undefined') options = {};
	if (typeof findScope == 'undefined') findScope = '$and';
	if (typeof level == 'undefined') level = 0;
	
	var wrap = this.compileLevel(query, options, findScope, level);
	
	if (!wrap.mainConditions) {
		wrap.mainConditions = {model: this.model.modelName.underscore().pluralize(), conditions: [{field: null, value: null}]};
	}

	wrap.conditions.unshift(wrap.mainConditions);

	pr(wrap, true);

	return wrap;
};

/**
 * Normalize the user defined query, one level at a time
 *
 * @param    {Object}   query       The query to compile
 * @param    {Object}   options     Some options
 * @param    {String}   findScope   The scope of this level ($and or $or)
 * @param    {integer}  level       How deep we are
 *
 * @returns  {array}    First entry = info, others are conditions
 */
DbQuery.prototype.compileLevel = function compileLevel(query, options, findScope, level) {
	
	var info = {models: [], submodels: [], joins: {}, findScope: findScope, level: level, subqueries: []},
	    conditions = [],
	    wrap = {info: info, conditions: conditions, mainConditions: false},
	    _w = {},
	    value,
	    fieldsModel,
	    fieldName,
	    newVal,
	    model;
	
	var counter = {},
	    subcounter = {};
	
	// Go over every entry in this query
	for (var field in query) {
		
		value = query[field];
		newVal = {};
		
		if (field == '$or' || field == '$and') {
			fieldsModel = false;
		} else {
			var f = field.deplugin();
			fieldName = f.field;
			f.model = f.model ? f.model : this.model.modelName;
			fieldsModel = f.model;
			fieldsModel = fieldsModel.underscore().pluralize();
		}
		
		if (fieldsModel) counter[fieldsModel] = true;
		
		if ((field == '$or' || field == '$and')
				&& (!(value instanceof RegExp) && (Array.isArray(value) || value instanceof Object))) {
			
			newVal = this.compileLevel(value, options, field, level+1);
			
			for (var i in newVal.info.models) subcounter[newVal.info.models[i]] = true;
			
			info.subqueries.push(newVal);
			
		} else {

			model = this.model.getModel(fieldsModel);
			
			if (typeof _w[fieldsModel] == 'undefined') {
				_w[fieldsModel] = {model: fieldsModel, conditions: []};
				
				// If this is a condition for the main model, add it to a separate array
				if (f.model == this.model.modelName) {
					wrap.mainConditions = _w[fieldsModel];
				} else {
					conditions.push(_w[fieldsModel]);
				}
			}
			
			if (typeof model.blueprint[fieldName] === 'undefined') {
				log.error('The field "' + fieldName + '" does not exist inside ' + model.name);
				continue;
			}

			// Turn ObjectId strings into actual ObjectId objects
			if (model.blueprint[fieldName].type == alchemy._mongoose.Schema.Types.ObjectId ||
				model.blueprint[fieldName].type.toLowerCase() === 'objectid') {

				// If the value is a string, turn it into a valid ObjectId
				if (typeof value === 'string') {
					value = alchemy._mongoose.mongo.BSONPure.ObjectID(value);
				}
			}

			_w[fieldsModel]['conditions'].push({field: fieldName, value: value});
		}
		
	}

	var i, m;
	
	for (i in counter) info.models.push(i);
	for (i in subcounter) info.submodels.push(i);
	
	for (i in info.models) {
		m = info.models[i];
		
		var mName = m.classify();
		
		if (mName != this.model.modelName) {
			if (this.model.associations[mName]) {
				//info.joins[mName.underscore().pluralize()] = this.associations[mName];
			} else {
				log.error('Tried to query a non-associated model: ' + mName, {level: 8});
			}
		}
	}
	
	// Add association information
	for (var mName in this.model.associations) {
		info.joins[mName.underscore().pluralize()] = this.model.associations[mName];
	}

	// If wrap isn't a valid query, look for everything
	if (!wrap) wrap = {};

	return wrap;
};