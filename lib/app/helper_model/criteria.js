const AUGMENTED = Symbol('AUGMENTED');

/**
 * The Criteria class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Criteria = Function.inherits('Alchemy.Base', 'Alchemy.Criteria', function Criteria() {

	// The current active group
	this.group = null;

	// All the created expressions
	this.all_expressions = [];

	// Create the actual group (is always AND)
	this.createGroup('and');

	// Store the root group
	this.root_group = this.group;

	// Other options
	this.options = {
		select        : new Select(this),
		document      : true,
		document_list : true
	};
});

/**
 * Is the given argument a Criteria instance?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   instance
 *
 * @return   {Boolean}
 */
Criteria.setStatic(function isCriteria(instance) {

	if (!instance || typeof instance != 'object') {
		return false;
	}

	if (instance instanceof Criteria) {
		return true;
	}

	return false;
});

/**
 * Make sure to get a criteria
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {Object}   obj
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function cast(obj) {

	if (Criteria.isCriteria(obj)) {
		return obj;
	}

	let instance = new Criteria();

	if (obj) {
		instance.applyOldOptions(obj);
	}

	return instance;
});

/**
 * Undry the given object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @param    {Object}   data
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function unDry(data) {

	var criteria = new Criteria();

	if (data.model) {
		try {
			criteria.model = alchemy.getModel(data.model);
		} catch (err) {
			// Ignore
			console.warn('Failed to find "' + data.model + '" model');
		}
	}

	// Revive the group instance
	criteria.group = Group.revive(data.group, criteria);

	if (!data.options) {
		data.options = {};
	}

	// Revive the select
	data.options.select = Select.revive(data.options.select, criteria);

	criteria.options = data.options || {};

	return criteria;
});

/**
 * Add a new value expression type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name   The name of the expression
 * @param    {Boolean}  cast   Cast the value [true]
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function addValueExpression(name, cast) {
	this.setMethod(name, function valueExpressionAdder(value) {

		var entry;

		this._ensureExpression(name);
		entry = this._active.addItem(name, value);

		if (cast != null) {
			entry.cast = cast;
		}

		return this;
	});
});

/**
 * Add a new field expression type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name   The name of the expression
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function addFieldExpression(name) {
	this.setMethod(name, function fieldExpressionAdder(value) {

		var entry;

		this._ensureExpression(name);
		entry = this._active.addItem(name, value);
		entry.field_expression = true;

		return this;
	});
});

/**
 * Create an augmented of this instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path
 * @param    {Criteria} criteria
 *
 * @return   {Object}
 */
Criteria.setStatic(function parsePath(path, criteria) {

	var target_path,
	    result = {},
	    pieces,
	    piece,
	    alias,
	    i;

	if (path.indexOf('.') > -1) {
		pieces = path.split('.');
	} else {
		pieces = [path];
	}

	for (i = 0; i < pieces.length; i++) {
		piece = pieces[i];
		alias = null;

		if (criteria && criteria.model) {
			if (criteria.model.associations[piece]) {
				alias = piece;
			}
		}

		if (!alias && piece[0].isUpperCase()) {
			alias = piece;
		}

		if (alias) {
			if (!result.association) {
				result.association = [];
			}

			result.association.push(alias);
			continue;
		}

		target_path = pieces.slice(i).join('.');
		break;
	}

	if (target_path) {
		result.target_path = target_path;
	}

	return result;
});

/**
 * Create a reference to the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Datasource}
 */
Criteria.setProperty(function datasource() {

	if (this._datasource) {
		return this._datasource;
	}

	if (this.model) {
		return this.model.datasource;
	}
}, function setDatasource(ds) {
	this._datasource = ds;
	return this._datasource;
});

/**
 * The recursiveness of this criteria
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Number}
 */
Criteria.setProperty(function recursive_level() {

	if (this.options.recursive) {
		return this.options.recursive;
	}

	return 0;
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 */
Criteria.setMethod(Blast.checksumSymbol, function toChecksum() {

	var name = this.model ? this.model.name : undefined,
	    result = [name],
	    options = {},
	    key;

	for (key in this.options) {

		if (key == 'init_model' || key == 'init_record' || key == 'assoc_cache') {
			continue;
		}

		options[key] = this.options[key];
	}

	result.push(options);
	result.push(this.group);

	return result;
});

/**
 * Allow the criteria to be used in a for wait loop
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Criteria.setMethod(Symbol.asyncIterator, function asyncIterator() {

	const that = this,
	      model = this.model;

	if (!model) {
		throw new Error('Unable to iterate over a criteria without a model');
	}

	// Clone it
	let criteria = this.clone();

	// Set the limit to 1
	criteria.limit(1);

	// Create the iterator context
	let context = {
		index : 0,
		next  : async function next() {

			criteria.skip(this.index++);

			let record = await model.find('first', criteria);

			if (!record) {
				return {done: true};
			}

			return {value: record, done: false};
		}
	};

	return context;
});

/**
 * Return object for jsonifying
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @return   {Object}
 */
Criteria.setMethod(function toJSON() {

	let result = {},
	    options;

	if (this.model && this.model.name) {
		result.model = this.model.name;
	}

	if (this.options) {
		let key;
		options = {};

		for (key in this.options) {
			if (key == 'assoc_cache' || key == 'init_record') {
				continue;
			}

			options[key] = this.options[key];
		}
	}

	result.group = this.group;
	result.options = options;

	return result;
});

/**
 * Dry this Criteria instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function toDry() {

	// Augments cannot be dried, it's ALWAYS the original instance
	var value = this.toJSON();

	return {
		value : value
	};
});

/**
 * Clone this instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function clone() {

	var data = JSON.toDryObject(this),
	    result;

	data.model = null;
	result = JSON.undry(data);

	result.model = this.model;

	return result;
});

/**
 * Get the main fields to select
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @return   {String[]}
 */
Criteria.setMethod(function getFieldsToSelect() {

	let result;

	if (this.options?.select?.fields?.length) {
		result = this.options.select.fields.slice(0);
	}

	// Fields can sometimes be required for a query (like in a join) but they
	// won't be selected if other fields are explicitly set.
	// So in that case: add these special fields to the projection
	if (result && this.options?.select?.query_fields) {
		result.push(...this.options.select.query_fields);
	}

	return result || [];
});

/**
 * Get the association selects, if any
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function getAssociationsToSelect() {

	var result = this.options.select.associations;

	return result;
});

/**
 * Should the given association be queried?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name
 *
 * @return   {Boolean}
 */
Criteria.setMethod(function shouldQueryAssociation(name) {

	var result = false;

	// If there are explicit associations selected,
	// then this one has to be in it!
	if (this.getAssociationsToSelect()) {
		result = this.options.select.shouldQueryAssociation(name);
	} else {
		// There are no explicit associations, look at the recursive level
		result = this.recursive_level > 0;
	}

	return result;
});

/**
 * Get association configuration in the current active model
 * or in the options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   alias
 *
 * @return   {Object}
 */
Criteria.setMethod(function getAssociationConfiguration(alias) {

	if (this.options.associations && this.options.associations[alias]) {
		return this.options.associations[alias];
	}

	return this.model.getAssociation(alias);
});

/**
 * Get a new criteria for adding associated data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @param    {String}   name
 * @param    {Object}   item
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function getCriteriaForAssociation(name, item) {

	if (!this.model) {
		throw new Error('Unable to create criteria for association "' + name + '" without originating model instance');
	}

	let assoc_model = this.model.getAliasModel(name),
	    data = item[this.model.name];

	// @TODO: For deadlock reasons we don't query self-referencing links!
	// (Implemented in Schema fields, BelongsTo and such could still pose problems!)
	if (assoc_model.name == this.options.init_model) {
		return;
	}

	let association = this.getAssociationConfiguration(name);

	let value = data[association.options.localKey];

	// If no valid value is found for the associated key, do nothing
	if (value == null) {
		return;
	}

	let assoc_crit = assoc_model.find(),
	    assoc_key = association.options.foreignKey,
	    options = this.options,
	    select;

	if (Array.isArray(value)) {
		assoc_crit.where(assoc_key).in(value);
	} else {
		assoc_crit.where(assoc_key).equals(value);
	}

	assoc_crit.setOption('assoc_key', assoc_key);
	assoc_crit.setOption('assoc_value', value);

	// Make the assoc_cache if it doesn't exist yet
	if (options.create_references !== false && !options.assoc_cache) {
		options.assoc_cache = {};
	}

	// Add the assoc_cache
	if (options.assoc_cache) {
		assoc_crit.setOption('assoc_cache', options.assoc_cache);
	}

	// Take over the locale option
	if (options.locale) {
		assoc_crit.setOption('locale', options.locale);
	}

	// The debug object, if there is one
	if (options._debugObject) {
		assoc_crit.setOption('_debugObject', options._debugObject);
	}

	// Don't get the available count
	assoc_crit.setOption('available', false);

	if (options.select.associations && options.select.associations[name]) {
		select = options.select.associations[name];
		assoc_crit.options.select = select.cloneForCriteria(assoc_crit);
	}

	// Sort the results
	// @TODO: add sorts
	// if (query.sort && query.sort[alias]) {
	// 	assocOpts.sort = query.sort[alias];
	// }

	if (Number.isSafeInteger(options.recursive) && options.recursive > 0) {
		assoc_crit.recursive(options.recursive - 1);
	} else {
		// Disable recursiveness for the next level
		assoc_crit.recursive(0);
	}

	// Add the model name from where we're adding associated data
	assoc_crit.setOption('init_model', options.init_model || this.model.name);
	assoc_crit.setOption('init_record', options.init_record || item);

	assoc_crit.setOption('from_alias', options.for_alias);
	assoc_crit.setOption('from_model', options.for_model);

	assoc_crit.setOption('for_alias', name);
	assoc_crit.setOption('for_model', assoc_model.name);

	// Honor the original document option
	assoc_crit.setOption('document', options.document);

	if (options.debug) {
		assoc_crit.setOption('debug', true);
		console.log('Associated criteria:', assoc_model.name, assoc_crit);
	}

	return assoc_crit;
});

/**
 * Create an augmented of this instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   type
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function augment(type) {

	var context = this,
	    result;

	if (context[AUGMENTED]) {
		// NO don't do this, we want chaining!
		//context = context[AUGMENTED];
	}

	// Create the new object with this instance as the prototype
	result = Object.create(context);

	// Remembed which object we augmented
	result[AUGMENTED] = context;

	return result;
});

/**
 * Limit the amount of records to get
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.7
 *
 * @param    {Number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function limit(amount) {

	if (typeof amount != 'number') {
		amount = parseInt(amount);
	}

	this.options.limit = amount;
	return this;
});

/**
 * Skip an amount of records
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.7
 *
 * @param    {Number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function skip(amount) {

	if (typeof amount != 'number') {
		amount = parseInt(amount);
	}

	this.options.skip = amount;
	return this;
});

/**
 * Get a specific page
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.2.7
 *
 * @param    {Number}   page        A 1-indexed page number
 * @param    {Number}   page_size
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function page(page, page_size) {

	if (typeof page != 'number') {
		page = parseInt(page);
	}

	if (page_size && typeof page_size != 'number') {
		page_size = parseInt(page_size);
	}

	if (!page) {
		throw new Error('A page number is required');
	}

	if (!page_size || !isFinite(page_size)) {
		page_size = 10;
	}

	let skip = (page - 1) * page_size;

	this.options.page = page;
	this.options.page_size = page_size;

	this.skip(skip);
	return this.limit(page_size);
});

/**
 * Select a specific field or association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {String|Array}   field
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function select(field) {

	var context;

	if (Object.isIterable(field)) {
		let entry;

		for (entry of field) {
			context = this.select(entry);
		}
	} else {

		if (this._select) {
			context = this._select.parse(field);
		} else {
			context = this.options.select.parse(field);
		}
	}

	// Selects don't always change the context
	if (context) {
		return context;
	}

	return this;
});

/**
 * Add a specific association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   alias
 *
 * @return   {Criteria}
 */
Criteria.setMethod(['contain', 'populate'], function populate(alias) {

	if (Array.isArray(alias)) {
		let i;

		for (i = 0; i < alias.length; i++) {
			this.populate(alias[i]);
		}
	} else {
		let select = this._select || this.options.select;

		select.addAssociation(alias);
	}

	return this;
});

/**
 * How deep can we go?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function recursive(amount) {
	this.options.recursive = amount;
	return this;
});


/**
 * Set the sort
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.4
 *
 * @param    {Array}   value
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function sort(value) {

	var result;

	if (value) {
		result = [];

		// Parse strings
		if (typeof value == 'string') {
			// When it contains a space, we expect something
			// like "_id asc"
			if (value.indexOf(' ') > -1) {
				result.push(value.split(' '));
			} else {
				// Sort ascending by default
				result.push([value, 1]);
			}
		} else if (Array.isArray(value)) {
			if (Array.isArray(value[0])) {
				result = value;
			} else {
				result.push(value);
			}
		} else {
			let keys = Object.keys(value),
			    key;

			if (keys.length == 2 && ~keys.indexOf('dir') && ~keys.indexOf('field')) {

				if (value.field && value.dir) {
					result.push([value.field, value.dir]);
				}

			} else {
				for (key in value) {
					result.push([key, value[key]]);
				}
			}
		}

		let entry,
		    i;

		for (i = 0; i < result.length; i++) {
			entry = result[i];

			if (typeof entry[1] == 'string') {
				entry[1] = entry[1].toLowerCase();

				if (entry[1] == 'asc') {
					entry[1] = 1;
				} else if (entry[1] == 'desc') {
					entry[1] = -1;
				} else {
					throw new Error('Unable to parse sort specification "' + entry[1] + '"');
				}
			}
		}

		// @TODO: implement better handling of ModelName.field sort stuff
		// (Because at this moment, it's just ignored!)
		for (entry of result) {
			if (entry[0].indexOf('.') > -1) {
				let pieces = entry[0].split('.'),
				    char = pieces[0][0];

				if (char == char.toUpperCase()) {
					pieces = pieces.slice(1);
				}

				entry[0] = pieces.join('.');
			}
		}

	} else {
		result = null;
	}

	this.options.sort = result;

	return this;
});

/**
 * Set a specific option
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   key
 * @param    {String}   value
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function setOption(key, value) {
	this.options[key] = value;
	return this;
});

/**
 * Create a new group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   type
 */
Criteria.setMethod(function createGroup(type) {

	var context = this,
	    group;

	if (this.group) {
		let old_group = context.group;
		context = context.augment('group');

		group = new Group(context, type);
		old_group.addItem(group);

		context.group = group;
	} else {
		group = new Group(this, type);
		this.group = group;
	}

	return context;
});

/**
 * Close the current active group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function closeGroup() {

	var context = this;

	if (this.group && this.group.current_group) {
		context = this.group.current_group.criteria;
	}

	return context;
});

/**
 * Add a new expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Expression}   expression
 */
Criteria.setMethod(function addNewExpression(expression) {

	// Make sure there is a criteria link
	if (!expression.criteria) {
		expression.criteria = this;
	}

	// Move the expression to the currently active group by default
	expression.moveToGroup(this.group);

	this.all_expressions.push(expression);
});

/**
 * Target a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name
 * @param    {*}        value
 */
Criteria.setMethod(function where(name, value) {

	var context = this.augment('field'),
	    expression = new FieldExpression(context, name);

	this.addNewExpression(expression);

	context._active = expression;

	if (arguments.length == 2) {
		context = context.equals(value);
	}

	return context;
});

/**
 * Create an or group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   type     Type of group: or, and, not, ...
 * @param    {String}   value
 */
Criteria.setMethod(function _applyGroup(type, value) {

	var context = this,
	    group,
	    temp;

	if (context._active) {
		temp = context._active.moveToGroup(type);
		context = temp;
	} else {
		context = context.createGroup(type);
	}

	if (arguments.length > 1) {
		let method = context._last_method;

		if (!method) {
			throw new Error('Unable to call ' + type + '() with a value when no previous method is called');
		}

		// Create new expression with the same field
		context = context.where(context._active.target_path);

		// Apply the method on it
		context[method](value);
	} else if (context._active) {
		// Create new expression with the same field
		context = context.where(context._active.target_path);
	}

	return context;
});

/**
 * Create an or group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   value
 */
Criteria.setMethod(function or(value) {

	var result;

	if (arguments.length) {
		return this._applyGroup('or', value);
	}

	return this._applyGroup('or');
});

/**
 * Create an and group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   value
 */
Criteria.setMethod(function and(value) {

	var result;

	if (arguments.length) {
		return this._applyGroup('and', value);
	}

	return this._applyGroup('and');
});

Criteria.addValueExpression('equals');
Criteria.addValueExpression('gte');
Criteria.addValueExpression('gt');
Criteria.addValueExpression('lte');
Criteria.addValueExpression('lt');
Criteria.addValueExpression('in');

// Add as value expressions of which we don't cast values
Criteria.addValueExpression('contains', false);
Criteria.addValueExpression('not', false);
Criteria.addValueExpression('ne', false);

Criteria.addFieldExpression('exists');
Criteria.addFieldExpression('isNull');
Criteria.addFieldExpression('isEmpty');

/**
 * Make sure there is an active expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   method
 */
Criteria.setMethod(function _ensureExpression(method) {

	if (!this._active) {
		throw new Error(method + '() must be called when an expression is active');
	}

	this._last_method = method;
});

/**
 * Normalize the criteria by filling in some values on datasources without joins
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Pledge}
 */
Criteria.setMethod(function normalize() {

	if (!this.model) {
		return Pledge.reject(new Error('Unable to normalize criteria without model instance'));
	}

	let that = this,
	    tasks = [],
	    i;

	for (i = 0; i < this.all_expressions.length; i++) {
		let expression = this.all_expressions[i];

		if (!expression) {
			continue;
		}

		// Do we need to normalize association values?
		if (expression.requires_association_normalization) {
			tasks.push(function doNormalize(next) {
				expression.normalizeAssociationValues().done(next);
			});

			continue;
		}

		let pledge = expression.normalize();

		if (pledge) {
			tasks.push(pledge);
		}
	}

	return Function.parallel(4, tasks);
});

/**
 * Compile to MongoDB-like query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function compile() {

	if (!this.datasource) {
		throw new Error('Unable to compile criteria without a datasource target');
	}

	return this.datasource.compileCriteria(this);
});

/**
 * Parse an old, mongodb specific options object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   options
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function applyOldOptions(options) {

	if (!options || Object.isEmpty(options)) {
		return this;
	}

	let entry,
	    key;

	for (key in options) {
		entry = options[key];

		switch (key) {
			case 'sort'      : this.sort(entry); break;
			case 'limit'     : this.limit(entry); break;
			case 'fields'    : this.select(entry); break;
			case 'select'    : this.select(entry); break;
			case 'recursive' : this.recursive(entry); break;
			case 'offset'    : this.skip(entry); break;
			case 'populate'  : this.populate(entry); break;

			case 'conditions':
				this.applyOldConditions(entry);
				break;

			default:
				this.setOption(key, entry);
		}
	}

	return this;
});

/**
 * Apply old-style mongodb conditions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   conditions
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function applyOldConditions(conditions) {

	if (!conditions || Object.isEmpty(conditions)) {
		return this;
	}

	let context = this,
	    value,
	    group,
	    key,
	    i;

	if (Array.isArray(conditions)) {
		for (i = 0; i < conditions.length; i++) {
			context.applyOldConditions(conditions[i]);
		}

		return context;
	}

	i = -1;

	for (key in conditions) {
		value = conditions[key];
		i++;

		if (key[0] == '$') {

			// Make sure no field is currently active,
			// else it'll be added to the $and or $or group
			context._active = null;

			if (key == '$or') {
				group = context.or();
			} else if (key == '$and') {

				group = context.and();
			} else {
				throw new Error('Unable to parse "' + key + '" group');
			}

			group.applyOldConditions(value);

		} else {

			if (i) {
				// If an object contains multiple items,
				// that's always treated as an $and group
				context = context.and();
			}

			context = context.where(key);

			if (Array.isArray(value)) {
				context = context.in(value);
				continue;
			} else if (value && typeof value == 'object') {
				let had_dollar,
				    method,
				    key;

				for (key in value) {
					if (key[0] == '$') {
						had_dollar = true;
						method = key.slice(1);

						if (typeof context[method] != 'function') {
							if (method == 'regex') {
								let regex;

								if (typeof value[key] == 'string') {
									regex = RegExp.interpret(RegExp.escape(value[key]), value.$options);
								} else {
									regex = RegExp.interpret(value[key], value.$options);
								}

								context.contains(regex);
								break;
							} else {
								throw new Error('Unable to parse "' + key + '" expression');
							}
						} else {
							context[method](value[key]);
						}
					}
				}

				if (had_dollar) {
					continue;
				}
			}

			context.equals(value);
		}
	}
});

/**
 * The Criteria Select class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Select = Function.inherits('Alchemy.Base', 'Alchemy.Criteria', function Select(criteria) {
	// The parent criteria instance
	this.criteria = criteria;
});

/**
 * Revive the given object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @return   {Select}
 */
Select.setStatic(function revive(data, criteria) {

	if (!data) {
		return;
	}

	let result = new Select(criteria),
	    key;

	result.fields = data.fields;

	if (data.associations) {
		result.associations = {};

		for (key in data.associations) {
			result.associations[key] = Select.revive(data.associations[key], criteria);
		}
	}

	if (data.association_name) {
		result.association_name = data.association_name;
	}

	return result;
});

/**
 * Return object to jsonify
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Select.setMethod(function toJSON() {
	return {
		association_name : this.association_name,
		associations     : this.associations,
		fields           : this.fields
	};
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Select.setMethod(Blast.checksumSymbol, function toChecksum() {

	var result = [];

	if (this.associations) {
		result.push(this.associations);
	}

	if (this.fields) {
		result.push(this.fields);
	}

	if (this.association_name) {
		result.push(this.association_name);
	}

	if (!result.length) {
		return null;
	}

	return result;
});

/**
 * Add an association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {String}   name
 *
 * @return   {Select}   This creates a new Select instance
 */
Select.setMethod(function addAssociation(name) {

	var pieces;

	if (!this.associations) {
		this.associations = {};
	}

	if (Array.isArray(name)) {
		pieces = name;
	} else if (name.indexOf('.') > -1) {
		pieces = name.split('.');
	}

	if (pieces && pieces.length) {
		let context = this;

		while (pieces.length) {
			name = pieces.shift();
			context = context.addAssociation(name);
		}

		return context;
	}

	if (!this.associations[name]) {
		this.associations[name] = new Select(this.criteria);
		this.associations[name].association_name = name;
	}

	// Get the association data
	try {
		let info = this.criteria.model.getAssociation(name);

		if (info) {
			// Make sure the localkey is added to the resultset
			this.requireFieldForQuery(info.options.localKey);
		}
	} catch (err) {
		console.warn('Failed to find "' + name + '" association for ' + this.criteria.model.model_name);
	}

	return this.associations[name];
});

/**
 * Require a field for query purposes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.0
 * @version  1.2.0
 *
 * @param    {String}   path
 */
Select.setMethod(function requireFieldForQuery(path) {

	if (!this.query_fields) {
		this.query_fields = [];
	}

	this.query_fields.push(path);
});

/**
 * Add a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path
 */
Select.setMethod(function addField(path) {

	if (!this.fields) {
		this.fields = [];
	}

	this.fields.push(path);
});

/**
 * Parse a path meant to add as a selection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {String|Object}   path
 *
 * @return   {Criteria|Null}   A criteria object if the context has changed
 */
Select.setMethod(function parse(path) {

	let context,
	    select = this,
	    parsed;

	if (typeof path == 'object' && path && path.name) {

		if (path.path) {
			path = path.path;
		} else {
			let obj = path;
			path = obj.name;

			if (obj.association) {
				path = obj.association + '.' + path;
			}
		}
	}

	parsed = Criteria.parsePath(path, this.criteria);

	// Associations were found,
	// like "Comment._id" or "Comment.User"
	if (parsed.association) {
		let name,
		    i;

		for (i = 0; i < parsed.association.length; i++) {
			name = parsed.association[i];

			if (this.model && this.model.name == name) {
				continue;
			}

			select = select.addAssociation(name);
		}
	}

	if (parsed.target_path) {
		select.addField(parsed.target_path);
	} else if (parsed.association) {
		// When only an association was given, then the context changes
		context = this.criteria.augment('select');
		context._select = select;
		return context;
	}
});

/**
 * Clone this select for the given criteria
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Select}
 */
Select.setMethod(function cloneForCriteria(criteria) {

	var clone = new Select(criteria);

	if (this.association_name) {
		clone.association_name = this.association_name;
	}

	if (this.fields && this.fields.length) {
		clone.fields = this.fields.slice(0);
	}

	if (this.query_fields && this.query_fields.length) {
		clone.query_fields = this.query_fields.slice(0);
	}

	if (this.associations) {
		let key;

		clone.associations = {};

		for (key in this.associations) {
			clone.associations[key] = this.associations[key].cloneForCriteria(criteria);
		}
	}

	return clone;
});

/**
 * Should the given association be queried according to this select?
 * (The Criteria instance can also have a recursive level set)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name
 *
 * @return   {Boolean}
 */
Select.setMethod(function shouldQueryAssociation(name) {

	if (this.associations) {
		return !!this.associations[name];
	}

	return false;
});

/**
 * The Base Criteria Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Expression = Function.inherits('Alchemy.Base', 'Alchemy.Criteria.Expression', function Expression(criteria) {

	// The parent criteria instance
	this.criteria = criteria;

	// The current group it's in
	this.current_group = null;

	// The items this contains
	this.items = [];
});

/**
 * Revive an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Expression}
 */
Expression.setStatic(function revive(data, criteria) {

	if (data._type == 'group') {
		return Group.revive(data, criteria);
	} else if (data._type == 'field') {
		return FieldExpression.revive(data, criteria);
	} else {
		throw new Error('Unable to revive "' + data._type + '" expression');
	}

});

/**
 * Does this expression do something with an association,
 * and do we need to normalize this on the current given datasource?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Expression.setProperty(function requires_association_normalization() {

	if (!this.association) {
		return false;
	}

	if (!this.datasource.supports('querying_associations')) {
		return true;
	}

	return false;
});

/**
 * Create a reference to the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Datasource}
 */
Expression.setProperty(function datasource() {
	if (this.criteria) {
		return this.criteria.datasource;
	}
});

/**
 * Create a reference to the model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Model}
 */
Expression.setProperty(function model() {
	if (this.criteria) {
		return this.criteria.model;
	}
});

/**
 * Create a reference to the field instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {FieldType}
 */
Expression.setProperty(function field() {
	if (this.criteria && this.criteria.model) {
		return this.criteria.model.schema.getField(this.target_path);
	}
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Expression.setMethod(Blast.checksumSymbol, function toChecksum() {
	return this.items;
});

/**
 * Get a clone without any Criteria or Group links
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Expression}
 */
Expression.setMethod(function getCleanClone() {

	var result = new this.constructor();

	// Add the cloned array
	result.items = JSON.clone(this.items);

	if (this.association) {
		result.association = this.association;
	}

	if (this.target_path) {
		result.target_path = this.target_path;
	}

	if (this.group_type) {
		result.group_type = this.group_type;
	}

	if (this.db_property) {
		result.db_property = this.db_property;
	}

	return result;
});

/**
 * Move the expression to the given group (object)
 * or the given group type (and/or)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object|String}   group
 */
Expression.setMethod(function moveToGroup(group) {

	var context = this.criteria;

	// Move to a specific type?
	if (typeof group == 'string') {

		// Is it already part of the same type of group?
		// Then we can ignore this call
		if (this.current_group && this.current_group.group_type == group) {
			return context;
		}

		// Create a new group of the given type
		context = context.createGroup(group);
		group = context.group;
	}

	if (this.current_group) {
		this.current_group.removeItem(this);
	}

	this.current_group = group;
	group.addItem(this);

	return context;
});

/**
 * Remove this expression from the criteria
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Expression.setMethod(function remove() {

	if (arguments.length) {
		throw new Error('Expression#remove() can only remove itself');
	}

	let index = this.criteria.all_expressions.indexOf(this);

	if (index > -1) {
		this.criteria.all_expressions.splice(index, 1);
	}

	if (this.current_group) {
		this.current_group.removeItem(this);
	}
});

/**
 * Add an item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   item
 */
Expression.setMethod(function addItem(item) {
	this.items.push(item);
	return item;
});

/**
 * Remove an item from this expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   item
 */
Expression.setMethod(function removeItem(item) {

	var index = this.items.indexOf(item);

	// If this expression was found in the current group, remove it
	if (index > -1) {
		this.items.splice(index, 1);
		return true;
	}

	return false;
});

/**
 * The Field Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var FieldExpression = Function.inherits('Alchemy.Criteria.Expression', function Field(criteria, field) {

	Field.super.call(this, criteria);

	if (arguments.length) {
		// Set the target
		this.setTargetPath(field);
	}
});

/**
 * Revive an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {FieldExpression}
 */
FieldExpression.setStatic(function revive(data, criteria) {

	var result = new FieldExpression();

	result.criteria = criteria;

	criteria.all_expressions.push(result);

	if (data.association) {
		result.association = data.association;
	}

	if (data.target_path) {
		result.target_path = data.target_path;
	}

	if (data.items) {
		result.items = data.items;
	}

	if (data.db_property) {
		result.db_property = data.db_property;
	}

	return result;
});

/**
 * Return object to jsonify
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
FieldExpression.setMethod(function toJSON() {
	return {
		_type        : 'field',
		association  : this.association,
		target_path  : this.target_path,
		items        : this.items,
		db_property  : this.db_property
	};
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
FieldExpression.setMethod(Blast.checksumSymbol, function toChecksum() {
	return [this.target_path, this.items];
});

/**
 * Set the target
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path
 */
FieldExpression.setMethod(function setTargetPath(path) {

	var pieces;

	if (typeof path == 'string') {
		if (path.indexOf('.') > -1) {
			pieces = path.split('.');
		}
	} else if (Array.isArray(path)) {
		pieces = path;
	} else {
		throw new Error('Field#setTargetPath(path) requires a string or an array');
	}

	if (!pieces) {
		this.target_path = path;
	} else {
		let first = pieces[0];

		// @TODO: better check if the first part is an association
		if (first[0].isUpperCase()) {
			this.association = first;
			pieces.shift();
		}

		this.target_path = pieces.join('.');
	}

});

/**
 * Add a new condition item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.5
 *
 * @param    {Object|String}   group
 *
 * @return   {Object}
 */
FieldExpression.setMethod(function addItem(type, value) {

	var entry = {
		type  : type
	};

	if (arguments.length > 1) {

		if (typeof value == 'object' && value && value instanceof Classes.Alchemy.Base) {
			throw new Classes.Alchemy.Error.Model('"' + value.constructor.getClassPath() + '" instance was given as a "' + this.target_path + '" condition');
		}

		entry.value = value;
	}

	this.items.push(entry);

	return entry;
});

/**
 * Normalize the values (like casting strings to objectids)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Pledge|Null}
 */
FieldExpression.setMethod(function normalize() {

	var field = this.field;

	if (!field) {
		return;
	}

	let item,
	    i;

	for (i = 0; i < this.items.length; i++) {
		item = this.items[i];

		// Skip field_expression items
		// (like $exists: true and such)
		// or items where `cast` is explicitly false
		if (item.field_expression || item.cast === false) {
			continue;
		}

		if (item.value != null) {
			if (Array.isArray(item.value)) {
				let result = [],
				    i;

				for (i = 0; i < item.value.length; i++) {
					result[i] = field.castCondition(item.value[i], this);
				}

				item.value = result;
			} else {
				item.value = field.castCondition(item.value, this);
			}
		}
	}
});

/**
 * Normalize association values by separately querying them
 * and adding the found values to the criteria
 *
 * @WARNING: this can be extremely resource intensive when using
 * on big collections.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Pledge}
 */
FieldExpression.setMethod(function normalizeAssociationValues() {

	if (!this.association) {
		return Pledge.reject(new Error('Unable to normalize a field without an association'));
	}

	let that = this,
	    association = this.model.getAssociation(this.association),
	    assoc_model = this.model.getModel(association.modelName),
	    assoc_crit = new Classes.Alchemy.Criteria(),
	    pledge = new Pledge(),
	    clone = this.getCleanClone(),
	    item,
	    i;

	// Unset the association
	clone.association = null;

	// Add the clone
	assoc_crit.addNewExpression(clone);

	// Only select the wanted field
	assoc_crit.select(association.options.foreignKey);

	assoc_model.find('all', {criteria: assoc_crit, document: false}, function gotAssocItems(err, items) {

		if (err) {
			return pledge.reject(err);
		}

		let values = [],
		    record,
		    i;

		for (i = 0; i < items.length; i++) {
			values.push(items[i][association.options.foreignKey]);
		}

		if (!values.length) {
			// @TODO: make this more elegant
			values.push('_impossible_');
		}

		// Remove the expression from the criteria
		that.remove();

		// And add this new one
		that.criteria.where(association.options.localKey).in(values);

		pledge.resolve();
	});

	return pledge;
});

/**
 * The Group Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Group = Function.inherits('Alchemy.Criteria.Expression', function Group(criteria, type) {

	Group.super.call(this, criteria);

	// The group type
	this.group_type = type;
});

/**
 * Revive an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Group}
 */
Group.setStatic(function revive(data, criteria) {

	var result = new Group(criteria),
	    i;

	result.group_type = data.group_type;

	if (data.items) {
		result.items = [];

		for (i = 0; i < data.items.length; i++) {
			result.items.push(Expression.revive(data.items[i], criteria));
		}
	}

	return result;
});

/**
 * Return object to jsonify
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Group.setMethod(function toJSON() {
	return {
		_type        : 'group',
		association  : this.association,
		group_type   : this.group_type,
		items        : this.items.slice(0)
	};
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Group.setMethod(Blast.checksumSymbol, function toChecksum() {
	return [this.group_type, this.items];
});

// PROTOBLAST START CUT
/**
 * Make the Criteria class a global
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Function}
 */
global.Criteria = Criteria;
// PROTOBLAST END CUT