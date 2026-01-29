const AUGMENTED = Symbol('AUGMENTED'),
      CriteriaNS = Function.getNamespace('Alchemy.Criteria'),
      Expressions = Function.getNamespace('Alchemy.Criteria.Expression');

/**
 * The Criteria class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const Criteria = Function.inherits('Alchemy.Base', 'Alchemy.Criteria', function Criteria(options) {

	// The current active group
	this.group = null;

	// All the created expressions
	this.all_expressions = [];

	// Create the actual group (is always AND)
	this.createGroup('and');

	// Store the root group
	this.root_group = this.group;

	// Other options
	this.options = options || {};
});

/**
 * Is the given argument a Criteria instance?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   instance
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object|string|Criteria}   conditions
 * @param    {Object}                   options
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function cast(conditions, options) {

	if (Criteria.isCriteria(conditions)) {
		return conditions;
	}

	if (typeof conditions == 'string') {
		conditions = Classes.Alchemy.Datasource.Nosql.convertAQLToConditions(conditions);
	}

	let instance = new Criteria(options);

	if (conditions) {
		instance.applyConditions(conditions);
	}

	return instance;
});

/**
 * Add a new value expression type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   name   The name of the expression
 * @param    {boolean}  cast   Cast the value [true]
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   name   The name of the expression
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
 * Undry the given object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   data
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function unDry(data) {

	let criteria = new this(data.options);

	// Revive the group instance
	criteria.group = Expressions.Group.revive(data.group, criteria);

	return criteria;
});

/**
 * Dry this Criteria instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function toDry() {

	// Augments cannot be dried, it's ALWAYS the original instance
	let value = this.toJSON();

	return {
		value : value
	};
});

/**
 * Return object for jsonifying
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function toJSON() {

	let result = {
		group   : this.group,
		options : {...this.options},
	};

	return result;
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 */
Criteria.setMethod(Blast.checksumSymbol, function toChecksum() {

	let name = this.model ? this.model.name : undefined,
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
 * Create an augmented version of this instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   type
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function augment(type) {

	let context = this;

	if (context[AUGMENTED]) {
		// NO don't do this, we want chaining!
		//context = context[AUGMENTED];
	}

	// Create the new object with this instance as the prototype
	let result = Object.create(context);

	// Remembed which object we augmented
	result[AUGMENTED] = context;

	return result;
});

/**
 * Set a specific option
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   key
 * @param    {string}   value
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function setOption(key, value) {
	this.options[key] = value;
	return this;
});

/**
 * Get all the queried fields
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {string[]}
 */
Criteria.setMethod(function getAllExpressionTargetPaths() {

	let field_set = new Set(),
	    expression;

	for (expression of this.all_expressions) {

		if (!expression.target_path) {
			continue;
		}

		field_set.add(expression.target_path);
	}

	return [...field_set];
});

/**
 * Create a new group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   type
 */
Criteria.setMethod(function createGroup(type) {

	let context = this,
	    group;

	if (this.group) {
		let old_group = context.group;
		context = context.augment('group');

		group = new Expressions.Group(context, type);
		old_group.addItem(group);

		context.group = group;
	} else {
		group = new Expressions.Group(this, type);
		this.group = group;
	}

	return context;
});

/**
 * Close the current active group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function closeGroup() {

	let context = this;

	if (this.group && this.group.current_group) {
		context = this.group.current_group.criteria;
	}

	return context;
});

/**
 * Compile to a (NoSQL) conditions object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   context   The optional context (for resolving values)
 *
 * @return   {Object}
 */
Criteria.setMethod(function compileToConditions(context) {
	return Classes.Alchemy.Datasource.Nosql.convertCriteriaToConditions(this, context);
});

/**
 * Get the associations to select (stub for base Criteria)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Object|undefined}
 */
Criteria.setMethod(function getAssociationsToSelect() {
	// Base criteria doesn't have associations
	return;
});

/**
 * Apply old-style mongodb conditions
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Object}   conditions
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function applyConditions(conditions, clear_field = true) {

	let context = this;

	if (!conditions || Object.isEmpty(conditions)) {
		return context;
	}

	if (conditions instanceof Criteria) {
		conditions = conditions.compileToConditions();
	}

	if (typeof conditions == 'string') {
		conditions = Classes.Alchemy.Datasource.Nosql.convertAQLToConditions(conditions);
	}

	if (Array.isArray(conditions)) {
		let i;

		for (i = 0; i < conditions.length; i++) {
			context.applyConditions(conditions[i]);
		}

		return context;
	}

	let value,
	    group,
	    key,
	    i = -1;

	for (key in conditions) {
		value = conditions[key];
		i++;

		if (key[0] == '$') {

			// Make sure no field is currently active,
			// else it'll be added to the $and or $or group
			if (clear_field) {
				context._active = null;
			}

			if (key == '$or') {
				group = context.or();
			} else if (key == '$and') {
				group = context.and();
			} else {
				throw new Error('Unable to parse "' + key + '" group');
			}

			group.applyConditions(value);

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

	return this;
});

/**
 * Target a field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {string}   name
 * @param    {*}        value
 */
Criteria.setMethod(function where(name, value) {

	let context = this.augment('field'),
	    expression = new Expressions.Field(context, name);

	this.addNewExpression(expression);

	context._active = expression;

	if (arguments.length == 2) {
		context = context.equals(value);
	}

	return context;
});

/**
 * Add a new expression
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Make sure there is an active expression
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   method
 */
Criteria.setMethod(function _ensureExpression(method) {

	if (!this._active) {
		throw new Error(method + '() must be called when an expression is active');
	}

	this._last_method = method;

	return this._active;
});

/**
 * Create an or group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   type     Type of group: or, and, not, ...
 * @param    {string}   value
 */
Criteria.setMethod(function _applyGroup(type, value) {

	let context = this;

	if (context._active) {
		let temp = context._active.moveToGroup(type);
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   value
 */
Criteria.setMethod(function or(value) {

	if (arguments.length) {
		return this._applyGroup('or', value);
	}

	return this._applyGroup('or');
});

/**
 * Create an and group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   value
 */
Criteria.setMethod(function and(value) {

	if (arguments.length) {
		return this._applyGroup('and', value);
	}

	return this._applyGroup('and');
});

/**
 * Alias for `ne`: Not equals check
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.2
 *
 * @param    {*}   value
 */
Criteria.setMethod(function notEquals(value) {
	return this.ne(value);
});

/**
 * Alias for `equals`
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   value
 */
Criteria.setMethod(function eq(value) {
	return this.equals(value);
});

/**
 * Add a filter from a user
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   value
 */
Criteria.setMethod(function matchesFilter(aql) {

	// We need to have selected a field
	let expression = this._ensureExpression('matchesFilter');

	let parsed;

	try {
		// First attempt: see if it's a valid AQL query
		parsed = Classes.Alchemy.Datasource.Nosql.convertAQLToConditions(aql);
	} catch (err) {
		try {
			let key = this._active.target_path;

			if (this._active.association) {
				key = this._active.association + '.' + key;
			}

			// Second attempt: see if it can be made valid by prepending the field name
			parsed = Classes.Alchemy.Datasource.Nosql.convertAQLToConditions(key + ' ' + aql);
		} catch (err) {

			if (aql.startsWith('"') || aql.startsWith("'")) {
				try {
					// Quoted strings should be looked for verbatim
					let unquoted = String.parseQuoted(aql);
					return this.equals(unquoted);
				} catch (err) {
					// Ignore
				}
			}

			// If it doesn't contain wildcards, wrap it in them
			if (!aql.includes('*')) {
				aql = '*' + aql + '*';
			}

			let regexp = RegExp.interpretWildcard(aql, 'i');
			return this.equals(regexp);
		}
	}

	this.applyConditions(parsed, false);

	return this;
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