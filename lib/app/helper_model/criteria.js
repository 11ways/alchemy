const AUGMENTED = Symbol('AUGMENTED');

/**
 * The Criteria class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
});

/**
 * Add a new expression type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}   name   The name of the expression
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function addExpressionType(name) {
	this.setMethod(name, function expressionAdder(value) {
		this._ensureExpression(name);
		this._active.addItem(name, value);
		return this;
	});
});

/**
 * Create an augmented of this instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
 * Create a new group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
 * @since    1.0.7
 * @version  1.0.7
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
 * Target a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}   name
 */
Criteria.setMethod(function where(name) {

	var context = this.augment('field'),
	    expression = new FieldExpression(context, name);

	// Move the expression to the currently active group by default
	expression.moveToGroup(this.group);

	this.all_expressions.push(expression);

	context._active = expression;

	return context;
});

/**
 * Create an or group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
		context = context.where(context._active.field);

		// Apply the method on it
		context[method](value);
	} else {
		// Create new expression with the same field
		context = context.where(context._active.field);
	}

	return context;
});

/**
 * Create an or group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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

Criteria.addExpressionType('contains');
Criteria.addExpressionType('equals');
Criteria.addExpressionType('not');
Criteria.addExpressionType('gte');
Criteria.addExpressionType('gt');
Criteria.addExpressionType('lte');
Criteria.addExpressionType('lt');
Criteria.addExpressionType('in');

/**
 * Make sure there is an active expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
 * Compile to MongoDB-like query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @return   {Object}
 */
Criteria.setMethod(function compile() {

	var result = [],
	    entry,
	    i;

	for (i = 0; i < this.group.items.length; i++) {
		entry = this.group.items[i];

		if (entry.group_type) {
			let obj = {};
			obj['$' + entry.group_type] = entry.criteria.compile();
			result.push(obj);
		} else {
			let item,
			    not,
			    obj = {};

			for (let i = 0; i < entry.items.length; i++) {
				item = entry.items[i];

				if (item.type == 'not') {
					if (item.value == null) {
						not = true;
					} else {
						obj.$ne = item.value;
					}
				} else if (item.type == 'equals') {
					obj = item.value;
				}

				if (not) {
					not = false;
					obj = {$ne: obj};
				}

				let field_entry = {};
				field_entry[entry.field] = obj;

				result.push(field_entry);
			}
		}
	}

	return result;
});

/**
 * The Base Criteria Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
 * Move the expression to the given group (object)
 * or the given group type (and/or)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
 * Add an item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {Object}   item
 */
Expression.setMethod(function addItem(item) {
	this.items.push(item);
});

/**
 * Remove an item from this expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
 * @since    1.0.7
 * @version  1.0.7
 */
var FieldExpression = Function.inherits('Alchemy.Criteria.Expression', function Field(criteria, field) {

	Field.super.call(this, criteria);

	// Set the target
	this.setTargetPath(field);
});

/**
 * Set the target
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
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
		this.field = path;
	} else {
		let first = pieces[0];

		// @TODO: better check if the first part is an association
		if (first[0].isUpperCase()) {
			this.association = first;
			pieces.shift();
		}

		this.field = pieces.join('.');
	}

});

/**
 * Add a new condition item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {Object|String}   group
 */
FieldExpression.setMethod(function addItem(type, value) {

	this.items.push({
		type  : type,
		value : value
	});

});

/**
 * The Group Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 */
var Group = Function.inherits('Alchemy.Criteria.Expression', function Group(criteria, type) {

	Group.super.call(this, criteria);

	// The group type
	this.group_type = type;
});