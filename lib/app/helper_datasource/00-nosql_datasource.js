/**
 * NoSQL Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var NoSQL = Function.inherits('Alchemy.Datasource', function Nosql(name, options) {
	Nosql.super.call(this, name, options);
});

/**
 * All comparison functions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic('comparisons', {});

/**
 * All logical operator functions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic('logical_operators', {});

/**
 * Add comparison function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic(function addComparison(fnc) {
	this.comparisons[fnc.name] = fnc;
});

/**
 * Add logical operator function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic(function addLogicalOperator(fnc) {
	this.logical_operators[fnc.name] = fnc;
});

/**
 * Lower than comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $lt(a, b) {
	return NoSQL.areComparable(a, b) && a < b;
});

/**
 * Lower than or equal comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $lte(a, b) {
	return NoSQL.areComparable(a, b) && a <= b;
});

/**
 * Greater than comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $gt(a, b) {
	return NoSQL.areComparable(a, b) && a > b;
});

/**
 * Greater than or equal comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $gte(a, b) {
	return NoSQL.areComparable(a, b) && a >= b;
});

/**
 * Not equal comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $ne(a, b) {

	if (a === undefined) {
		return true;
	}

	return !Object.alike(a, b);
});

/**
 * In comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $in(a, b) {

	var i;

	if (!Array.isArray(b)) {
		throw new Error("$in operator called with a non-array");
	}

	for (i = 0; i < b.length; i++) {
		if (Object.alike(a, b[i])) {
			return true;
		}
	}

	return false;
});

/**
 * Not in comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $nin(a, b) {
	return !this.$in(a, b);
});

/**
 * Regex comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $regex(a, b) {

	if (!RegExp.isRegExp(b)) {
		throw new Error('$regex operator called with non regular expression');
	}

	if (typeof a != 'string') {
		return false;
	}

	return b.test(a);
});

/**
 * Exists comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $exists(value, exists) {

	// The value needs to be truthy or an empty string
	// (This is how mongo does it, so 0 or false returns falsy)
	exists = !!(exists || exists === '');

	if (value === undefined) {
		return !exists;
	} else {
		return exists;
	}
});

/**
 * Array size comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $size(obj, value) {

	if (!Array.isArray(obj)) {
		return false;
	}

	if (value % 1 !== 0) {
		throw new Error('$size operator called without an integer');
	}

	return obj.length == value;
});

/**
 * Array elemMatch comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $elemMatch(obj, value) {

	var i;

	if (!Array.isArray(obj)) {
		return result;
	}

	while (i--) {
		if (NoSQL.match(obj[i], value)) {
			return true;
		}
	}

	return false;
});

/**
 * Match any of the subqueries
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addLogicalOperator(function $or(obj, query) {

	var i;

	if (!Array.isArray(query)) {
		throw new Error('$or operator used without an array');
	}

	for (i = 0; i < query.length; i++) {
		if (NoSQL.match(obj, query[i])) {
			return true;
		}
	}

	return false;
});

/**
 * Match all of the subqueries
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addLogicalOperator(function $and(obj, query) {

	var i;

	if (!Array.isArray(query)) {
		throw new Error('$and operator used without an array');
	}

	for (i = 0; i < query.length; i++) {
		if (!NoSQL.match(obj, query[i])) {
			return false;
		}
	}

	return true;
});

/**
 * Inverted match of the query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addLogicalOperator(function $not(obj, query) {
	return !NoSQL.match(obj, query);
});

/**
 * Use a function to match
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addLogicalOperator(function $where(obj, fnc) {

	var result;

	if (typeof fnc != 'function') {
		throw new Error('$where operator used without a function');
	}

	result = fnc.call(obj);

	if (typeof result != 'boolean') {
		throw new Error('$where function must return boolean');
	}

	return result;
});

/**
 * Match an object against a specific {key: value} part of a query.
 * If the treatObjAsValue flag is set,
 * don't try to match every part separately, but the array as a whole.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {Object}   obj
 * @param    {Object}   query
 *
 * @return   {Boolean}
 */
NoSQL.setStatic(function matchQueryPart(obj, query_key, query_value, treat_obj_as_value) {

	var dollar_first_chars,
	    first_chars,
	    obj_value,
	    keys,
	    i;

	obj_value = NoSQL.getDotValue(obj, query_key);

	// @TODO: On the client side, in indexdb, dates are dried.
	// It's stupid to undry the entire object just to check a date,
	// so just undry a piece of it
	if (Blast.isBrowser && obj_value && typeof obj_value == 'object' && obj_value.dry) {
		obj_value = Blast.Bound.JSON.undry(obj_value);
	}

	// Check if the value is an array if we don't force a treatment as value
	if (Array.isArray(obj_value) && !treat_obj_as_value) {
		// If the queryValue is an array, try to perform an exact match
		if (Array.isArray(query_value)) {
			return matchQueryPart(obj, query_key, query_value, true);
		}

		// Check if we are using an array-specific comparison function
		if (query_value !== null && typeof query_value === 'object' && !RegExp.isRegExp(query_value)) {
			keys = Object.keys(query_value);

			for (i = 0; i < keys.length; i++) {
				if (keys[i] == '$size' || keys[i] == '$elemMatch') {
					return matchQueryPart(obj, query_key, query_value, true);
				}
			}
		}

		// If not, treat it as an array of { obj, query } where there needs to be at least one match
		for (i = 0; i < obj_value.length; i++) {
			if (matchQueryPart({k: obj_value[i]}, 'k', query_value)) {
				return true;
			}
		}

		return false;
	}

	// query_value is an actual object. Determine whether it
	// contains comparison operators or only normal fields.
	// Mixed objects are not allowed
	if (query_value !== null && typeof query_value === 'object' && !RegExp.isRegExp(query_value) && !Array.isArray(query_value)) {
		keys = Object.keys(query_value);

		first_chars = keys.map(function eachItem(item) {
			return item[0];
		});

		dollar_first_chars = first_chars.filter(function eachChar(c) {
			return c === '$';
		});

		if (dollar_first_chars.length !== 0 && dollar_first_chars.length !== first_chars.length) {
			throw new Error('You cannot mix operators and normal fields');
		}

		// query_value is an object of this form:
		// {$comparison_operator_1: value_1, ...}
		if (dollar_first_chars.length > 0) {
			for (i = 0; i < keys.length; i++) {
				if (!NoSQL.comparisons[keys[i]]) {
					throw new Error('Unknown comparison function ' + keys[i]);
				}

				if (!NoSQL.comparisons[keys[i]](obj_value, query_value[keys[i]])) {
					return false;
				}
			}

			return true;
		}
	}

	// Using regular expressions with basic querying
	if (RegExp.isRegExp(query_value)) {
		return NoSQL.comparisons.$regex(obj_value, query_value);
	}

	// query_value is either  anative value or a normal object
	// Basic matching is possible
	if (!Object.alike(obj_value, query_value)) {
		return false;
	}

	return true;
});

/**
 * Tell if a given document matches a query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   obj
 * @param    {Object}   query
 *
 * @return   {Boolean}
 */
NoSQL.setStatic(function match(obj, query) {

	var query_value,
	    query_keys,
	    query_key,
	    i;

	// Primitive queyr against a primitive type
	if (Object.isPrimitive(obj) || Object.isPrimitive(query)) {
		return this.matchQueryPart({need_a_key: obj}, 'need_a_key', query);
	}

	// Normal query
	query_keys = Object.keys(query);

	for (i = 0; i < query_keys.length; i++) {
		query_key = query_keys[i];
		query_value = query[query_key];

		if (query_key[0] == '$') {
			if (!this.logical_operators[query_key]) {
				throw new Error('Unknown logical operator ' + query_key);
			}

			if (!this.logical_operators[query_key](obj, query_value)) {
				return false;
			}
		} else {
			if (!this.matchQueryPart(obj, query_key, query_value)) {
				return false;
			}
		}
	}

	return true;
});

/**
 * Parse a record path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   path
 *
 * @return   {Object}
 */
NoSQL.setStatic(function parseRecordPath(path) {

	var result = {},
	    first;

	// Cast to an array of path pieces
	if (!Array.isArray(path)) {
		path = path.split('.');
	}

	// Get the first character of the (possible) alias
	first = path[0][0];

	// Check if it's a valid uppercase character
	if (first === first.toUpperCase() && first !== first.toLowerCase()) {
		result.alias = path.shift();
	}

	result.path = path;
	result.field = path[0];

	return result;
});

/**
 * Get a value from object with dot notation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
NoSQL.setStatic(function getDotValue(obj, path) {

	var pieces,
	    first,
	    objs,
	    i;

	if (Array.isArray(path)) {
		pieces = path;
	} else {
		pieces = path.split('.');
	}

	if (!obj) {
		return undefined;
	}

	if (pieces.length == 0) {
		return obj;
	}

	first = pieces[0];

	if (pieces.length == 1) {
		return obj[first];
	}

	if (Array.isArray(obj[first])) {
		i = parseInt(pieces[1], 10);

		if (typeof i === 'number' && !isNaN(i)) {
			return getDotValue(obj[first][i], pieces.slice(2));
		}

		// Return the array of values
		objs = [];

		for (i = 0; i < obj[first].length; i++) {
			objs.push(getDotValue(obj[first][i], pieces.slice(1)));
		}

		return objs;
	}

	return getDotValue(obj[first], pieces.slice(1));
});

/**
 * Are 2 values comparable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Boolean}
 */
NoSQL.setStatic(function areComparable(a, b) {

	var at = typeof a,
	    bt = typeof b;

	if (at != bt) {
		return false;
	}

	if (at != 'string' && at != 'number' && !Date.isDate(a) &&
		bt != 'string' && bt != 'number' && !Date.isDate(b)) {
		return false;
	}

	return true;
});

/**
 * Compile criteria into a MongoDB query object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.2
 *
 * @param    {Criteria}   criteria
 * @param    {Group}      group
 *
 * @return   {Object}
 */
NoSQL.setMethod(function compileCriteria(criteria, group) {

	var assoc_model,
	    aggregate,
	    result = [],
	    entry,
	    assoc,
	    temp,
	    i;

	if (!group) {
		group = criteria.group;
	}

	for (i = 0; i < group.items.length; i++) {
		entry = group.items[i];

		// If the "association" is actually the current model, just remove it
		if (entry.association && entry.association == criteria.model.model_name) {
			entry.association = null;
		}

		if (entry.association) {
			if (!aggregate) {
				aggregate = {
					pipeline: [],
					lookups: {}
				};
			}

			// Get the association info
			assoc = criteria.model.getAssociation(entry.association);

			if (result.length) {
				aggregate.pipeline.push({
					$match: {
						$and: result
					}
				});

				result = [];
			}

			if (!aggregate.lookups[assoc.alias]) {
				aggregate.lookups[assoc.alias] = true;
				assoc_model = alchemy.getModel(assoc.modelName);

				if (assoc.type == 'BelongsTo') {
					// Add a check so that we only get records that have a parent
					temp = {};
					temp[assoc.options.localKey] = {$ne: null};

					aggregate.pipeline.push({
						$match: temp
					});

					aggregate.pipeline.push({
						$lookup: {
							from         : assoc_model.table,
							localField   : assoc.options.localKey,
							foreignField : assoc.options.foreignKey,
							as           : assoc.alias
						}
					});
				} else if (assoc.type == 'HasMany') {

					aggregate.pipeline.push({
						$lookup: {
							from         : assoc_model.table,
							localField   : assoc.options.localKey,
							foreignField : assoc.options.foreignKey,
							as           : assoc.alias
						}
					});
				} else {
					throw new Error('No support for ' + assoc.type + ' association yet');
				}

				if (assoc.options.singular) {
					aggregate.pipeline.push({
						$unwind: '$' + assoc.alias
					});
				}
			}
		}

		if (entry.group_type) {
			let compiled_group = this.compileCriteria(entry.criteria, entry),
			    obj = {};

			if (compiled_group.$and) {
				compiled_group = compiled_group.$and;
			} else if (compiled_group.pipeline) {
				// @TODO: this won't work
				compiled_group = compiled_group.pipeline;
			} else {
				compiled_group = null;
			}

			if (compiled_group) {
				obj['$' + entry.group_type] = compiled_group;
				result.push(obj);
			}
		} else {
			let item,
			    not,
			    obj = {};

			for (let i = 0; i < entry.items.length; i++) {
				item = entry.items[i];

				if (item.type == 'ne') {
					obj.$ne = item.value;
				} else if (item.type == 'not') {
					if (typeof item.value == 'undefined') {
						not = true;
						continue;
					} else {
						obj.$not = item.value;
					}
				} else if (item.type == 'equals') {
					obj = item.value;
				} else if (item.type == 'contains') {
					obj = RegExp.interpret(item.value);
				} else if (item.type == 'in') {

					// @TODO: This shouldn't be needed,
					// Mongo actually allows this, but NeDB does NOT
					if (Array.isArray(item.value) && item.value.length == 1 && Array.isArray(item.value[0])) {
						item.value = item.value[0];
					}

					obj = {$in: item.value};
				} else if (item.type == 'gt' || item.type == 'gte' || item.type == 'lt' || item.type == 'lte') {
					obj['$' + item.type] = item.value;
				} else if (item.type == 'exists') {
					if (item.value || item.value == null) {
						obj.$exists = true;
					} else {
						obj.$exists = false;
					}
				} else if (item.type == 'isNull') {
					obj = null;

					if (item.value === false) {
						obj = {$ne: null};
					}
				} else if (item.type == 'isEmpty') {

					let exists = false,
					    comparator = '$eq';

					if (item.value === false) {
						exists = true;
						comparator = '$ne';
					}

					let $or = [
						{$exists: exists}
					];

					if (entry.field.is_array) {
						$or.push({[comparator]: []});
					} else if (entry.field instanceof Classes.Alchemy.Field.String) {
						$or.push({[comparator]: ''});
					}

					$or.push({[comparator]: null});

					obj.$or = $or;
				} else {
					throw new Error('Unknown criteria expression: "' + item.type + '"');
				}

				let field_entry = {},
				    name = entry.target_path;

				// Do we need to look into an object itself?
				// (Like the "timestamp" property of a date field when stored with units)
				if (entry.db_property) {
					name += '.' + entry.db_property;
				}

				if (entry.association) {
					name = entry.association + '.' + name;
				}

				if (obj && obj.$or) {

					let $or = [],
					    i;

					for (i = 0; i < obj.$or.length; i++) {
						$or.push({
							[name] : obj.$or[i]
						});
					}

					if (not) {
						let $and = [],
						    $not,
						    key,
						    i;

						for (i = 0; i < $or.length; i++) {
							$not = {};

							for (key in $or[i]) {
								$not[key] = {$not: $or[i][key]};
							}

							$and.push($not);
						}

						field_entry.$and = $and;
					} else {
						field_entry.$or = $or;
					}

				} else {

					if (not) {
						not = false;

						if (Object.isPrimitive(obj)) {
							obj = {$ne: obj};
						} else {
							obj = {$not: obj};
						}
					}

					// Temporary fix to actually query translatable field contents
					// (entry.field can be undefined if trying to query a path)
					if (entry.field && entry.field.is_translatable) {
						let $or = [];

						for (let key in Prefix.all()) {
							let temp = {};
							temp[name + '.' + key] = obj;
							$or.push(temp);
						}

						field_entry.$or = $or;
					} else {
						field_entry[name] = obj;
					}
				}

				result.push(field_entry);
			}
		}
	}

	if (aggregate) {

		if (result.length) {
			aggregate.pipeline.push({
				$match: {
					$and: result
				}
			});
		}

		return aggregate;
	}

	if (!result.length) {
		return {};
	}

	return {$and: result};
});


/**
 * Get the MongoDB options from this criteria
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Object}
 */
NoSQL.setMethod(function compileCriteriaOptions(criteria) {

	var result = {},
	    fields = criteria.getFieldsToSelect();

	if (fields.length) {
		result.projection = fields;
	} else {
		result.projection = null;
	}

	if (criteria.options.sort) {
		result.sort = criteria.options.sort;
	}

	if (criteria.options.skip) {
		result.skip = criteria.options.skip;
	}

	if (criteria.options.limit) {
		result.limit = criteria.options.limit;
	}

	return result;
});

/**
 * Handle items from the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Model}   model
 * @param    {Array}   rows
 *
 * @return   {Array}
 */
NoSQL.setMethod(function organizeResultItems(model, rows) {

	var associations = model.associations || {},
	    result = [],
	    main,
	    row,
	    set,
	    key,
	    i;

	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		main = {};
		set = {};

		for (key in row) {
			if (associations[key] != null) {
				set[key] = row[key];
			} else {
				main[key] = row[key];
			}
		}

		set[model.name] = main;
		result.push(set);
	}

	return result;
});