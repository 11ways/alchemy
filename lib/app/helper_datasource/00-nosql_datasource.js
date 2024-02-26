/**
 * NoSQL Datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var NoSQL = Function.inherits('Alchemy.Datasource', 'Nosql');

/**
 * All comparison functions
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic('comparisons', {});

/**
 * All logical operator functions
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic('logical_operators', {});

/**
 * Add comparison function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic(function addComparison(fnc) {
	this.comparisons[fnc.name] = fnc;
});

/**
 * Add logical operator function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.setStatic(function addLogicalOperator(fnc) {
	this.logical_operators[fnc.name] = fnc;
});

/**
 * Lower than comparison
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $lt(a, b) {
	return NoSQL.areComparable(a, b) && a < b;
});

/**
 * Lower than or equal comparison
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $lte(a, b) {
	return NoSQL.areComparable(a, b) && a <= b;
});

/**
 * Greater than comparison
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $gt(a, b) {
	return NoSQL.areComparable(a, b) && a > b;
});

/**
 * Greater than or equal comparison
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $gte(a, b) {
	return NoSQL.areComparable(a, b) && a >= b;
});

/**
 * Not equal comparison
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addComparison(function $nin(a, b) {
	return !this.$in(a, b);
});

/**
 * Regex comparison
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
NoSQL.addLogicalOperator(function $not(obj, query) {
	return !NoSQL.match(obj, query);
});

/**
 * Use a function to match
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {Object}   obj
 * @param    {Object}   query
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   obj
 * @param    {Object}   query
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {string}   path
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Criteria}   criteria   The criteria to convert
 * @param    {Object}     context    The optional context (for Trail retrieval)
 *
 * @return   {Object}
 */
NoSQL.setStatic(function convertCriteriaToConditions(criteria, context) {

	let config = {
		for_database: false,
	};

	return convertCriteriaToConditionsWithConfig(criteria, config, context);
});

/**
 * Compile criteria into a MongoDB query object with the given configuration
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Criteria}   criteria   The criteria to convert
 * @param    {Object}     config     Configuration flags
 * @param    {Object}     context    The optional context
 *
 * @return   {Object}
 */
function convertCriteriaToConditionsWithConfig(criteria, config, context) {

	if (context) {
		if (!Object.isPlainObject(context) || !context.$0) {
			context = {$0: context};
		}
	}

	if (!config) {
		config = {
			for_database : false,
		};
	}

	return convertCriteriaGroupToConditions(criteria, criteria.group, config, context);
}

/**
 * Compile criteria into a MongoDB query object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Criteria}   criteria   The criteria to convert
 * @param    {Group}      group      The current group
 * @param    {Object}     config     Configuration flags
 * @param    {Object}     context    The optional context
 *
 * @return   {Object}
 */
function convertCriteriaGroupToConditions(criteria, group, config, context) {

	let is_for_database = config?.for_database,
	    assoc_model,
	    aggregate,
	    result = [],
	    entry,
	    assoc,
	    temp,
	    i;

	let getAggregate = () => {
		if (!aggregate) {
			aggregate = {
				pipeline: [],
				lookups: {}
			};
		}
	}

	for (i = 0; i < group.items.length; i++) {
		entry = group.items[i];

		// If the "association" is actually the current model, just remove it
		if (entry.association && entry.association == criteria.model.model_name) {
			entry.association = null;
		}

		if (entry.association) {
			getAggregate();

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
			let compiled_group = convertCriteriaGroupToConditions(entry.criteria, entry, config, context),
			    obj = {};

			if (compiled_group.$and) {
				compiled_group = compiled_group.$and;
			} else if (compiled_group.pipeline) {
				// @TODO: this won't work
				compiled_group = compiled_group.pipeline;
			} else {
				compiled_group = Array.cast(compiled_group);
			}

			if (compiled_group) {
				obj['$' + entry.group_type] = compiled_group;
				result.push(obj);
			}
		} else {
			let item,
			    not,
			    obj = {};

			let field_entry = {},
			    name = entry.target_path,
			    queries_property = name.indexOf('.') > -1;

			// Do we need to look into an object itself?
			if (entry.db_property) {

				// Make sure the query doesn't already specifically query this property
				if (name == entry.field.path) {
					name += '.' + entry.db_property;
					queries_property = true;
				}
			}

			if (entry.association) {
				name = entry.association + '.' + name;
			}

			for (let i = 0; i < entry.items.length; i++) {
				item = entry.items[i];

				if (context && item.value && typeof item.value == 'object') {
					item = {
						...item,
						value : Classes.Develry.Placeholder.deepResolve(item.value, context),
					};
				}

				// If the value is a RegExp, we might have to stringify the value
				if (shouldStringify(entry, item) && RegExp.isRegExp(item.value)) {

					let stringified_field = name + '_stringified';

					getAggregate();

					aggregate.pipeline.push({
						$addFields: {
							[stringified_field]: {
								$convert: {
									input: '$' + name,
									to: 'string',
									onError: '',
									onNull: ''
								}
							}
						}
					});

					name = stringified_field;
				}

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

					let do_regexp_search = true;

					if (entry.field) {
						if (entry.field.is_array || entry.field.options?.type == 'HasAndBelongsToMany') {
							do_regexp_search = false;
							obj = item.value;
						}
					}

					if (do_regexp_search) {
						obj = RegExp.interpret(item.value);
					}
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

					if (is_for_database) {
						let exists = false,
						    comparator = '$eq';

						if (item.value === false) {
							exists = true;
							comparator = '$ne';
						}

						let $or = [
							{$exists: exists}
						];

						if (!entry.field) {
							throw new Error('Could not find field for path "' + entry.target_path + '" in model ' + entry.model?.name);
						}

						if (entry.field.is_array) {
							$or.push({[comparator]: []});
						} else if (entry.field instanceof Classes.Alchemy.Field.String) {
							$or.push({[comparator]: ''});
						}

						$or.push({[comparator]: null});

						obj.$or = $or;
					} else {
						obj = {$isEmpty: item.value ?? true};
					}
				} else {
					throw new Error('Unknown criteria expression: "' + item.type + '"');
				}

				let multiple_fields,
				    prefixed_name = name;

				// Temporary fix to actually query translatable field contents
				// (entry.field can be undefined if trying to query a path)
				if (entry.field?.is_translatable) {

					let prefix = criteria.options.locale,
					    specific_prefix = !!prefix;

					if (specific_prefix && criteria?.model?.translate === false) {
						specific_prefix = false;
					}

					// If a prefix is specified, only query that translation
					if (specific_prefix) {
						prefixed_name = name + '.' + prefix;
					} else {
						multiple_fields = [];

						// No prefixes specified, so look through all translations
						for (let key in Prefix.all()) {
							multiple_fields.push(name + '.' + key);
						}
					}
				}

				if (obj && obj.$or) {

					let $or = [],
					    i;

					for (i = 0; i < obj.$or.length; i++) {

						if (multiple_fields) {
							for (let name of multiple_fields) {
								$or.push({
									[name] : obj.$or[i]
								});
							}
						} else {
							$or.push({
								[prefixed_name] : obj.$or[i]
							});
						}
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
					if (multiple_fields) {

						let $or = [];

						for (let name of multiple_fields) {
							let temp = {};
							temp[name] = obj;
							$or.push(temp);
						}

						field_entry.$or = $or;
					} else {
						field_entry[prefixed_name] = obj;
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
		result = {};
	} else if (result.length === 1) {
		result = result[0];
	} else {
		result = {$and: result};
	}

	return result;
};

/**
 * Compile criteria into a MongoDB-compatible query object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Criteria}   criteria
 * @param    {Group}      group
 *
 * @return   {Object}
 */
NoSQL.setMethod(function compileCriteria(criteria, group) {
	return convertCriteriaToConditionsWithConfig(criteria, {for_database: true}, group);
});

/**
 * Is the given item about a string field?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.2.0
 *
 * @param    {Object}   entry
 * @param    {Object}   item
 *
 * @return   {boolean}
 */
function shouldStringify(entry, item) {

	if (!item || !item.value) {
		return false;
	}

	try {
		let field = entry.model.getField(entry.target_path);

		// The field value should only be stringified if it isn't a string already
		return !(field instanceof Classes.Alchemy.Field.String);
	} catch (err) {}

	return false;
}

/**
 * Compile an AQL string into a MongoDB-compatible query object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   query
 *
 * @return   {Object}
 */
NoSQL.setStatic(function convertAQLToConditions(query) {

	let tokens = tokenizeAQL(query);

	let conditions = convertAQLTokens(tokens, (name, operator, value, not) => {

		switch (operator) {
			case 'is':
			case 'eq':
			case '==':
			case '=':
				operator = '$eq';
				break;

			case 'ne':
			case '!=':
				operator = '$ne';
				break;

			case 'gt':
			case '>':
				operator = '$gt';
				break;

			case 'gte':
			case '>=':
				operator = '$gte';
				break;

			case 'lt':
			case '<':
				operator = '$lt';
				break;

			case 'lte':
			case '<=':
				operator = '$lte';
				break;

			case 'empty':
				operator = '$isEmpty';
				value = {value: !not};
				break;
		}

		switch (value.type) {
			case 'name':
				value = Trail.fromDot(value.value).ifNull(null);
				break;
			
			case 'number':
				value = Number(value.value);
				break;

			case 'boolean':
				value = value.value == 'true';
				break;
			
			case 'string':
				value = String.parseQuoted(value.value);
				break;
			
			default:
				value = value.value;
				break;
		}

		let result = {
			[name]: {
				[operator]: value,
			}
		};

		return result;
	});

	return conditions;
});

/**
 * Parse the AQL query into tokens
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   query
 *
 * @return   {Array}
 */
function tokenizeAQL(query) {

	const START_STATE = 1,
	      NAME_STATE = 2,
	      OPERATOR_STATE = 3,
	      VALUE_STATE = 4;

	let expressions = [],
	    tokens = Function.tokenize(query, true),
	    current_name,
	    current_operator,
	    current_value,
	    current_not,
	    lower,
	    token,
	    type,
	    value,
	    i;

	let current_state = START_STATE;
	let states = [current_state];

	const replaceState = state => {
		states[states.length - 1] = state;
		current_state = state;
	};

	const pushState = state => {
		current_state = state;
		states.push(current_state);
		return current_state;
	};

	const popState = () => {
		current_state = states.pop();
		return current_state;
	};

	const createGroup = () => {

		if (hasCurrent()) {
			closeValue();
		}

		expressions.push(true);
		pushState(START_STATE);
	};

	const closeGroup = () => {

		if (hasCurrent()) {
			closeValue();
		}

		popState();
		expressions.push(false);
	};

	const setValue = (token) => {

		if (token === true) {
			current_value = true;
		} else {

			let new_value = {
				type : token.type,
				value: token.value,
				not  : !!current_not,
			};

			if (current_value) {
				if (current_value.type == 'name') {
					current_value.value = current_value.value + new_value.value;
				} else {
					reject('Unexpected value');
				}
			} else {
				current_value = new_value;
			}
		}
	};

	const hasCurrent = () => !!(current_name || current_operator || current_value);

	const closeValue = (next_logic_type) => {

		if (!hasCurrent()) {
			reject('Incomplete statement');
		}

		let entry = [
			current_name,
			current_operator,
			current_value,
			current_not,
			next_logic_type,
		];

		expressions.push(entry);

		current_name = null;
		current_operator = null;
		current_value = null;
		current_not = null;
		replaceState(START_STATE);
	}

	const reject = (message) => {
		throw new Error(message);
	};

	for (i = 0; i < tokens.length; i++) {
		token = tokens[i];
		type = token.type;

		// All whitespace can be ignored
		if (type == 'whitespace') {
			continue;
		}

		value = token.value;

		if (value == '(') {
			createGroup();
			continue;
		}

		if (value == ')') {
			closeGroup();
			continue;
		}

		lower = value.toLowerCase();

		if (current_state == START_STATE) {
			if (type != 'name') {
				reject('Expected name');
			}

			if (lower == 'not' || lower == 'and' || lower == 'or') {
				expressions.push(lower);
			} else {
				current_name = value;
				pushState(NAME_STATE);
			}
		} else if (current_state == NAME_STATE) {

			if (type == 'punct') {
				if (value == '.') {
					current_name += '.';
				} else {
					current_operator = value;
					replaceState(OPERATOR_STATE);
				}
			} else if (type == 'name') {
				if (lower == 'not') {
					current_not = !current_not;
					console.log('NOT! Current operator is', current_operator);
					replaceState(OPERATOR_STATE);
				} else if (lower == 'is') {
					current_operator = '==';
					replaceState(OPERATOR_STATE);
				} else {
					current_name += value;
				}
			}
		} else if (current_state == OPERATOR_STATE) {

			// Is there already an operator?
			if (current_operator) {
				if (lower == 'not') {
					current_not = !current_not;
				} else if (type == 'name' && lower == 'empty') {
					current_operator = 'empty';
					setValue(true);
					replaceState(VALUE_STATE);
				} else {
					setValue(token);
					replaceState(VALUE_STATE);
				}
			} else if (type == 'name') {
				current_operator = lower;
			} else {
				reject('Expected operator');
			}
		} else if (current_state == VALUE_STATE) {

			if (type == 'name') {
				if (lower == 'not' && !current_value) {
					current_not = !current_not;
				} else if (lower == 'or' || lower == 'and') {
					if (!current_value) {
						reject('Expected a value');
					}

					closeValue(lower);
					continue;
				}
			}

			if (type == 'punct') {
				if (value == '.') {
					setValue(token);
				} else {
					reject('Unexpected punctuation');
				}
			} else if (type == 'name') {
				setValue(token);
			} else if (current_value) {
				reject('Unexpected string');
			} else {
				setValue(token);
			}
		}
	}

	if (hasCurrent()) {
		closeValue();
	}

	return expressions;
}

/**
 * Convert AQL tokens into a conditions object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   query
 *
 * @return   {Object}
 */
function convertAQLTokens(expressions, expression_converter) {

	let current_group,
	    current_logic,
	    next_is_not,
	    expression,
	    i;

	// Make sure there currently exists a group with the given logic type
	const ensureGroup = (logic) => {

		if (!current_group) {
			current_group = {
				logic,
				expressions: [],
			};
		} else {

			if (!current_group.logic) {
				current_group.logic = logic;
			} else if (current_group.logic != logic) {
				pushGroup(logic);
			}
		}

		current_logic = current_group.logic;

		return current_group;
	};

	// Create the root group
	let root = ensureGroup();

	// Start a new group of the given logic type.
	const pushGroup = (logic) => {

		let group = {
			logic,
			expressions: [],
			not: next_is_not
		};

		if (logic == 'or') {
			group.expressions.push(simplifyGroups(current_group));
			current_group = current_group.parent;
		}

		group.parent = current_group;

		if (!current_group) {
			root = group;
		} else {
			current_group.child = group;
		}

		current_group = group;
	};

	// Close the current group (& restore the parent group)
	const closeGroup = () => {
		let group = current_group;
		current_group = group.parent;
	}

	const simplifyGroups = (group) => {

		let result = {};
		let logic;

		if (group.logic == 'and' || !group.logic) {
			logic = '$and';
		} else if (group.logic == 'or') {
			logic = '$or';
		} else {
			throw new Error('Unknown logic type');
		}

		result[logic] = group.expressions;

		if (group.child) {
			result[logic].push(simplifyGroups(group.child));
		}

		if (group.not) {
			result = {
				$nor: result
			};
		}

		return result;
	};

	for (i = 0; i < expressions.length; i++) {
		expression = expressions[i];

		if (expression === true) {
			pushGroup();
		} else if (expression === false) {
			closeGroup();
		} else if (expression === 'and' || expression === 'or') {
			ensureGroup(expression);
		} else if (expression === 'not') {
			next_is_not = true;
			continue;
		} else {

			current_logic = expression[4];

			// And gets precedence
			if (current_logic == 'and') {
				ensureGroup(current_logic);
			}

			expression = expression_converter(...expression);

			current_group.expressions.push(expression);

			if (current_logic == 'or') {
				ensureGroup(current_logic);
			}
		}

		next_is_not = false;
	}

	return simplifyGroups(root);
}

/**
 * Get the MongoDB options from this criteria
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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