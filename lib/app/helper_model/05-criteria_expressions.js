/**
 * The Base Criteria Expression class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const Expression = Function.inherits('Alchemy.Base', 'Alchemy.Criteria.Expression', function Expression(criteria) {

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Expression.setMethod(Blast.checksumSymbol, function toChecksum() {
	return this.items;
});

/**
 * Get a clone without any Criteria or Group links
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object|string}   group
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const FieldExpression = Function.inherits('Alchemy.Criteria.Expression', function Field(criteria, field) {

	Field.super.call(this, criteria);

	if (arguments.length) {
		// Set the target
		this.setTargetPath(field);
	}
});

/**
 * Revive an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @return   {Object}
 */
FieldExpression.setMethod(function toJSON() {

	let result = {
		_type        : 'field',
		target_path  : this.target_path,
		items        : this.items,
	};

	if (this.association) {
		result.association = this.association;
	}

	if (this.db_property) {
		result.db_property = this.db_property;
	}

	return result;
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 */
FieldExpression.setMethod(Blast.checksumSymbol, function toChecksum() {
	return this.toJSON();
});

/**
 * Set the target
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   path
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.5
 *
 * @param    {Object|string}   group
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
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
	    assoc_crit = new Classes.Alchemy.Criteria.Model(),
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const Group = Function.inherits('Alchemy.Criteria.Expression', function Group(criteria, type) {

	Group.super.call(this, criteria);

	// The group type
	this.group_type = type;
});

/**
 * Revive an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Group}
 */
Group.setStatic(function revive(data, criteria) {

	let result = new Group(criteria);

	result.group_type = data.group_type;

	if (data.items) {
		let i;
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @return   {Object}
 */
Group.setMethod(function toJSON() {

	let result = {
		_type        : 'group',
		group_type   : this.group_type,
		items        : this.items.slice(0)
	};

	if (this.association) {
		result.association = this.association;
	}

	return result;
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Group.setMethod(Blast.checksumSymbol, function toChecksum() {
	return this.toJSON();
});