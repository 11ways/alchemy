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

	// Create the actual group (is always AND)
	this.createGroup('and');

	// Store the root group
	this.root_group = this.group;

	// All the created expressions
	this.all_expressions = [];

	// Other options
	this.options = {
		fields        : [],
		contain       : [],
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
 * Add a new value expression type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name   The name of the expression
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function addValueExpression(name) {
	this.setMethod(name, function valueExpressionAdder(value) {
		this._ensureExpression(name);
		this._active.addItem(name, value);
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
 * Create a reference to the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Datasource}
 */
Criteria.setProperty(function datasource() {
	if (this.model) {
		return this.model.datasource;
	}
});

/**
 * Get a checksum of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Criteria.setMethod(function toChecksum() {
	return Object.checksum([
		this.model.name,
		this.options,
		this.group
	]);
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
 * @version  1.1.0
 *
 * @param    {Number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function limit(amount) {
	this.options.limit = amount;
	return this;
});

/**
 * Skip an amount of records
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function skip(amount) {
	this.options.skip = amount;
	return this;
});

/**
 * Select the given field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String|Array}   field
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function select(field) {

	if (Array.isArray(field)) {
		let i;

		for (i = 0; i < field.length; i++) {
			this.select(field[i]);
		}
	} else {
		this.options.fields.push(field);
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
Criteria.setMethod(function contain(alias) {

	if (Array.isArray(alias)) {
		let i;

		for (i = 0; i < alias.length; i++) {
			this.contain(alias[i]);
		}
	} else {
		this.options.contain.push(alias);
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
 * @version  1.1.0
 *
 * @param    {Array}   value
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function sort(value) {
	this.options.sort = value;
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
 */
Criteria.setMethod(function where(name) {

	var context = this.augment('field'),
	    expression = new FieldExpression(context, name);

	this.addNewExpression(expression);

	context._active = expression;

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

Criteria.addValueExpression('contains');
Criteria.addValueExpression('equals');
Criteria.addValueExpression('not');
Criteria.addValueExpression('gte');
Criteria.addValueExpression('gt');
Criteria.addValueExpression('lte');
Criteria.addValueExpression('lt');
Criteria.addValueExpression('in');
Criteria.addFieldExpression('exists');

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
			case 'recursive' : this.recursive(entry); break;
			case 'offset'    : this.skip(entry); break;

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

	for (key in conditions) {
		value = conditions[key];

		if (key[0] == '$') {
			if (key == '$or') {
				group = context.or();
			} else if (key == '$and') {
				group = context.and();
			} else {
				throw new Error('Unable to parse "' + key + '" group');
			}

			group.applyOldConditions(value);

		} else {
			context = context.where(key);

			if (Array.isArray(value)) {
				context = context.in(value);
			} else {
				context.equals(value);
			}
		}
	}
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
	if (this.criteria && this.criteria.model) {
		return this.criteria.model.datasource;
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
		return this.criteria.model.schema.get(this.target_path);
	}
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
 * @version  1.1.0
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
		if (item.field_expression) {
			continue;
		}

		if (item.value != null) {
			item.value = field.castCondition(item.value);
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