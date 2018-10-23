/**
 * The DbQuery class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.1
 *
 * @param    {Model}    model      The originating model
 * @param    {Object}   options    The find options
 * @param    {Number}   level      The current level (associated model)
 */
var DbQuery = Function.inherits('Alchemy.Base', function DbQuery(model, options, level) {

	// The originating model
	this.model = model;

	// The connection
	this.connection = model.connection;

	// The query options
	this.options = options;

	// The fields to return
	this.fields = false;

	// The fields we need to query
	this.queryFields = false;

	// Sort options
	this.sort = null;

	// Possible errors
	this.error = false;

	// Store the current recursive level
	this.level = level || 0;

	// Should we debug?
	this.debug = !!options.debug;

	// Store how deep we can go
	this.recursive = options.recursive;

	// Are there translation specific conditions?
	this.translation_conditions = [];

	if (options.page && options.limit) {
		options.offset = (options.page - 1) * options.limit;
	}

	this.processFields();
	this.processSort();
	this.processContain();
});

/**
 * All comparison functions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.setStatic('comparisons', {});

/**
 * All logical operator functions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.setStatic('logical_operators', {});

/**
 * Add comparison function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.setStatic(function addComparison(fnc) {
	this.comparisons[fnc.name] = fnc;
});

/**
 * Add logical operator function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.setStatic(function addLogicalOperator(fnc) {
	this.logical_operators[fnc.name] = fnc;
});

/**
 * Lower than comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addComparison(function $lt(a, b) {
	return DbQuery.areComparable(a, b) && a < b;
});

/**
 * Lower than or equal comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addComparison(function $lte(a, b) {
	return DbQuery.areComparable(a, b) && a <= b;
});

/**
 * Greater than comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addComparison(function $gt(a, b) {
	return DbQuery.areComparable(a, b) && a > b;
});

/**
 * Greater than or equal comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addComparison(function $gte(a, b) {
	return DbQuery.areComparable(a, b) && a >= b;
});

/**
 * Not equal comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addComparison(function $ne(a, b) {

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
DbQuery.addComparison(function $in(a, b) {

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
DbQuery.addComparison(function $nin(a, b) {
	return !this.$in(a, b);
});

/**
 * Regex comparison
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addComparison(function $regex(a, b) {

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
DbQuery.addComparison(function $exists(value, exists) {

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
DbQuery.addComparison(function $size(obj, value) {

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
DbQuery.addComparison(function $elemMatch(obj, value) {

	var i;

	if (!Array.isArray(obj)) {
		return result;
	}

	while (i--) {
		if (DbQuery.match(obj[i], value)) {
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
DbQuery.addLogicalOperator(function $or(obj, query) {

	var i;

	if (!Array.isArray(query)) {
		throw new Error('$or operator used without an array');
	}

	for (i = 0; i < query.length; i++) {
		if (DbQuery.match(obj, query[i])) {
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
DbQuery.addLogicalOperator(function $all(obj, query) {

	var i;

	if (!Array.isArray(query)) {
		throw new Error('$and operator used without an array');
	}

	for (i = 0; i < query.length; i++) {
		if (!DbQuery.match(obj, query[i])) {
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
DbQuery.addLogicalOperator(function $not(obj, query) {
	return !DbQuery.match(obj, query);
});

/**
 * Use a function to match
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.addLogicalOperator(function $where(obj, fnc) {

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
 * @version  1.0.0
 *
 * @param    {Object}   obj
 * @param    {Object}   query
 *
 * @return   {Boolean}
 */
DbQuery.setStatic(function matchQueryPart(obj, query_key, query_value, treat_obj_as_value) {

	var dollar_first_chars,
	    first_chars,
	    obj_value,
	    keys,
	    i;

	obj_value = DbQuery.getDotValue(obj, query_key);

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
				if (!this.comparisons[keys[i]]) {
					throw new Error('Unknown comparison function ' + keys[i]);
				}

				if (!this.comparisons[keys[i]](obj_value, query_value[keys[i]])) {
					return false;
				}
			}

			return true;
		}
	}

	// Using regular expressions with basic querying
	if (RegExp.isRegExp(query_value)) {
		return this.comparisons.$regex(obj_value, query_value);
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
DbQuery.setStatic(function match(obj, query) {

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
DbQuery.setStatic(function parseRecordPath(path) {

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
DbQuery.setStatic(function getDotValue(obj, path) {

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
DbQuery.setStatic(function areComparable(a, b) {

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
 * Get a list of prefixes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DbQuery.setMethod(function getPrefixes() {

	var result;

	if (this.model && this.model.render) {
		result = [this.model.render.prefix].concat(this.model.render.fallback);
	} else {
		if (typeof Prefix != 'undefined') {
			result = Prefix.getPrefixList();
		}
	}

	return result;
});

/**
 * Get a checksum of this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.4.0
 */
DbQuery.setMethod(function toChecksum() {
	return Object.checksum([
		this.model.name,
		this.options.conditions,
		this.options.contain,
		this.options.limit,
		this.options.offset,
		this.options.available,
		this.fields,
		this.sort,
		this.recursive
	]);
});

/**
 * Process containable instructions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 */
DbQuery.setMethod(function processContain() {

	// Don't process anything if no contain options are given
	if (Object.isEmpty(this.options.contain)) {
		this.contain = false;
		return;
	}

	this.contain = Object.objectify(this.options.contain, true, true);
});

/**
 * Normalize the conditions by fetching associated data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.3.3
 */
DbQuery.setMethod(function normalize(callback) {

	var that       = this,
	    tasks      = [],
	    normalized = {},
	    divided;

	if (this.debug) {
		console.log('Normalizing conditions', this.options.conditions);
	}

	// Turn the root $and object into an array
	divided = Object.divide(this.options.conditions);

	this.normalizeGroup('$and', normalized, divided, function doneRootGroup(err) {

		if (err) {
			return callback(err);
		}

		if (that.debug) {
			console.log('Normalized conditions are:', normalized);
		}

		callback(null, normalized);
	});
});

/**
 * Normalize the given group
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.3.3
 *
 * @param    {String}   type         The type of group ($and, $or, $not)
 * @param    {Object}   target       An object where the compiled conditions go
 * @param    {Object}   conditions   The conditions to compile
 * @param    {Function} callback
 */
DbQuery.setMethod(function normalizeGroup(type, target, conditions, callback) {

	var that  = this,
	    tasks = [],
	    collections  = {},
	    subgroups    = {};

	// Handle array of conditions
	if (Array.isArray(conditions)) {

		conditions.forEach(function eachCondition(obj, index) {
			tasks[tasks.length] = function normalizeTask(next) {

				var temp = {};

				that.normalizeGroup('$and', temp, obj, function() {
					next(null, temp);
				});
			};
		});

		Function.parallel(tasks, function normalizedConditions(err, arr) {

			if (err) {
				return callback(err);
			}

			if (!target[type]) {
				target[type] = [];
			}

			target[type] = target[type].concat(arr);

			// Make sure every $or and $and group is a non-empty array
			if (Array.isArray(target.$or) && target.$or.length == 0) {
				delete target.$or;
			}

			if (Array.isArray(target.$and) && target.$and.length == 0) {
				delete target.$and;
			}

			callback();
		});

		return;
	}

	// Group by collections first
	Object.each(conditions, function eachCondition(value, fieldPath) {

		var fieldConfig,
		    fieldPaths,
		    prefixes,
		    temp,
		    obj,
		    i;

		// See if it's a subgroup
		if (fieldPath[0] === '$') {

			if (fieldPath == '$text') {
				if (!target['$and']) {
					target['$and'] = [];
				}

				// $text values need to be objects, for mongo at least
				if (typeof value == 'string') {
					value = {$search: value};
				}

				target['$and'].push({$text: value});
				return;
			}

			subgroups[fieldPath] = value;
			return;
		}

		// Get field config information
		fieldConfig = that.getFieldInfo(fieldPath, true);

		if (that.debug) {
			console.log(fieldPath, fieldConfig, fieldConfig.alias, that.model.name);
		}

		// If it's a translatable field we'll need to sort by a dot-notation path
		if (fieldConfig.config.isTranslatable) {
			temp = {};
			temp[fieldPath] = value;

			// Remember translatable conditions
			that.translation_conditions.push({
				query : temp,
				value : value,
				path  : fieldPath
			});

			prefixes = that.getPrefixes();

			fieldPaths = [fieldConfig.path];

			for (i = 0; i < prefixes.length; i++) {
				fieldPaths.push(fieldConfig.field + '.' + prefixes[i]);
			}
		} else {
			fieldPaths = [fieldConfig.path];
		}

		// If a "fallback" field has been given, also look there
		if (fieldConfig.config.fallback) {
			fieldPaths.push(fieldConfig.config.fallback);
		}

		// Cast the value to the correct type
		if (fieldConfig.config.castForQuery) {
			value = fieldConfig.config.castForQuery(value, fieldPaths);
		}

		// If it's a condition for the main model, just add it to the target
		if (fieldConfig.alias == that.model.name) {

			if (fieldPaths.length == 1) {
				target[fieldPaths.first()] = value;
			} else {

				if (!target['$or']) {
					target['$or'] = [];
				}

				for (i = 0; i < fieldPaths.length; i++) {
					obj = {};
					obj[fieldPaths[i]] = value;
					target['$or'].push(obj);
				}
			}

			return;
		}

		if (!collections[fieldConfig.alias]) {
			collections[fieldConfig.alias] = {
				fieldConfig : fieldConfig,
				table       : fieldConfig.table,
				model       : fieldConfig.model,
				conditions  : {}
			};
		}

		// Add it to the collections conditions
		if (fieldPaths.length == 1) {
			collections[fieldConfig.alias].conditions[fieldPaths.first()] = value;
		} else {
			if (!collections[fieldConfig.alias].conditions['$or']) {
				collections[fieldConfig.alias].conditions['$or'] = [];
			}

			for (i = 0; i < fieldPaths.length; i++) {
				obj = {};
				obj[fieldPaths[i]] = value;
				collections[fieldConfig.alias].conditions['$or'].push(obj);
			}
		}
	});

	// Now we'll handle the external collections
	Object.each(collections, function eachCollection(collection, alias) {

		tasks[tasks.length] = function getExternalCollection(next) {

			var config = that.model.associations[alias],
			    fields = {},
			    conds  = {},
			    assocKey,
			    localKey,
			    needLength;

			localKey = config.options.localKey;
			assocKey = config.options.foreignKey;

			// Indicate we only want the associate field value
			fields[assocKey] = 1;

			if (type == '$or') {
				conds['$or'] = Object.divide(collection.conditions);
			} else {
				// $not and $ands are both looked for using $and,
				// $not will be inverted later on
				conds['$and'] = Object.divide(collection.conditions);
			}

			needLength = true;

			// Hack to get {$exists: false} working
			Object.walk(conds, function eachCond(value, key, parent) {
				if (key == '$exists' && value == false) {
					needLength = false;
				}
			});

			collection.model.readDatasource(conds, {fields: fields}, function doneRead(err, items) {

				var ids  = [],
				    temp = {},
				    i;

				if (that.debug) {
					console.log('Querying assoc', collection.model.name, 'conds:', conds, 'result:', err, items, 'field config:', config);
				}

				if (err) {
					return next(err);
				}

				// Put these ids in an $and array
				if (!target.$and) {
					target.$and = [];
				}

				if (!items.length) {
					if (needLength) {
						ids.push('no_assoc_data_found');
					}
				} else {
					for (i = 0; i < items.length; i++) {
						ids.push(items[i][assocKey]);
					}
				}

				// If no length is needed, and no ids have been found then
				// don't add the condition
				if (!needLength && !ids.length) {
					return next();
				}

				// Add the normalized condition
				temp[localKey] = {$in: ids};

				// If it was in a $not group, wrap it in a $not object
				if (type == '$not') {
					temp[localKey] = {$not: temp[localKey]};
				}

				target.$and.push(temp);

				next();
			});
		};
	});

	if (this.error) {
		return callback(this.error);
	}

	if (this.debug) {
		console.log('Normalizing query subgroups:', subgroups);
	}

	// Now we'll handle subgroups
	Object.each(subgroups, function eachSubgroup(subgroup, subtype) {

		tasks[tasks.length] = function subGroupTask(next) {

			var newTarget = {};

			if (that.debug) {
				console.log('Normalizing subgroup type "' + subtype + '"', subgroup);
			}

			that.normalizeGroup(subtype, newTarget, subgroup, function normalizedSubGroup() {

				var key,
				    obj,
				    notobj;

				if (!target[subtype]) {
					target[subtype] = [];
				}

				if (subtype === '$not') {

					// $not groups don't actually exist in mongodb
					delete target['$not'];

					// @todo: this just adds it to other $and groups,
					// which could be not what we want in complicated queries
					subtype = '$and';
				}

				for (key in newTarget) {

					obj = {};
					obj[key] = newTarget[key];

					// Make sure the subtype exists ($and / $or)
					// It could be this doesn't exist yet when only searching
					// with a $not condition
					if (!target[subtype]) {
						target[subtype] = [];
					}

					target[subtype].push(obj);
				}

				if (that.debug) {
					console.log('Final conds', target);
				}

				next();
			});
		};
	});

	// Execute all the finds
	Function.parallel(tasks, function executedAllFinds() {
		callback();
	});
});

/**
 * Process the sort options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 */
DbQuery.setMethod(function processSort() {

	var sort = this.options.sort,
	    aliasSort,
	    fieldInfo,
	    prefixes,
	    name,
	    temp,
	    key,
	    val,
	    i;

	if (sort == null) {
		if (Array.isArray(this.model.sort)) {
			sort = this.model.sort.slice(0);
		} else if (this.model.sort) {
			sort = Object.assign({}, this.model.sort);
		}
	}

	// If sort is explicitly false, don't sort anything!
	if (sort === false) {
		return;
	}

	aliasSort = {};

	// @todo: Keep using arrays, do not use objects.
	// arrays are actually the correct way to provide sorting data,
	// since only arrays maintain their order. Objects do not.
	if (Array.isArray(sort)) {
		temp = sort;
		sort = {};

		for (i = 0; i < temp.length; i++) {
			sort[temp[i]] = 1;
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
		fieldInfo = this.getFieldInfo(key, true);

		// If it's a translatable field we'll need to sort by a dot-notation path
		if (fieldInfo.config && fieldInfo.config.translatable && this.model.render) {

			prefixes = this.getPrefixes();

			name = [];

			for (i = 0; i < prefixes.length; i++) {
				name.push(fieldInfo.field + '.' + prefixes[i]);
			}
		} else {
			name = [fieldInfo.path];
		}

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
		this.addQueryField(fieldInfo);

		for (i = 0; i < name.length; i++) {
			aliasSort[fieldInfo.alias][name[i]] = val;
		}
	}

	// If there is nothing to sort, set the property to false
	if (Object.isEmpty(aliasSort)) {
		sort = false;
	} else {
		sort = aliasSort;
	}

	this.sort = sort;
});

/**
 * Execute the query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.4.2
 *
 * @param    {Function}   callback
 */
DbQuery.setMethod(function execute(callback) {

	var that  = this,
	    tasks,
	    schema;

	if (this.error) {
		setImmediate(function() {
			callback(that.error);
		});
		return;
	}

	tasks = {};
	schema = this.model.schema;

	// Normalize the conditions by getting associated data
	this.normalize(function gotNormalizedConditions(err, conditions) {

		var options = {},
		    associations = {},
		    alias;

		if (that.error) {
			return callback(that.error)
		}

		// Limit the amount of fields returned if the fields object has been set
		if (that.fields && that.fields[that.model.name]) {
			options.fields = that.fields[that.model.name];

			for (alias in that.fields) {
				if (schema.associations[alias]) {
					associations[alias] = schema.associations[alias];
				}
			}
		} else {

			if (that.contain) {
				associations = {};

				for (alias in that.contain) {
					if (schema.associations[alias]) {
						associations[alias] = schema.associations[alias];
					}
				}
			} else {
				associations = schema.associations;
			}
		}

		// Sort the results
		if (that.sort && that.sort[that.model.name]) {
			options.sort = that.sort[that.model.name];
		}

		if (that.options.limit > 0) {
			options.limit = that.options.limit;
		}

		if (that.options.offset > 0) {
			options.skip = that.options.offset;
		}

		options.recursive = that.options.recursive;
		options.available = that.options.available;

		// Store the associations we need to look for later
		that.associations = associations;

		that.model.emit('reading_datasource', that);

		// Query the main model
		that.model.readDatasource(conditions, options, function gotItems(err, items, available) {

			var item_prefixes = [],
			    translations,
			    found_prefix,
			    condition,
			    results,
			    record,
			    prefix,
			    temp,
			    i,
			    j;

			that.model.emit('read_datasource', that);

			if (err) {
				return callback(err);
			}

			if (items == null) {
				return callback(new Error('Query read returned null results'));
			}

			results = [];

			for (i = 0; i < items.length; i++) {
				record = {};
				record[that.model.name] = items[i];
				found_prefix = null;

				if (that.options.locale && that.options.locale !== true) {
					found_prefix = that.options.locale;
				} else {
					FindPrefix:
					for (j = 0; j < that.translation_conditions.length; j++) {
						condition = that.translation_conditions[j];

						// Get the translation object
						translations = Object.path(items[i], condition.path);

						// Go over every found prefix
						for (prefix in translations) {
							temp = Object.setPath({}, condition.path, translations[prefix]);

							// If this translatable condition matches what was found,
							// then this is the found prefix
							// @todo: currently only 1 prefix will be set,
							// even if there are multiple conditions with
							// multiple matches in different translations
							if (DbQuery.match(temp, condition.query)) {
								found_prefix = prefix;
								break FindPrefix;
							}
						}
					}
				}

				item_prefixes.push(found_prefix);
				results.push(record);
			}

			if (that.debug) {
				console.log('Query results for', that.model.name, conditions, options, JSON.parse(JSON.stringify(results)));
			}

			results.available = available;
			results.item_prefixes = item_prefixes;

			return callback(null, results);
		});
	});
});

/**
 * If the field option has been provided,
 * limit the fields returned
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
DbQuery.setMethod(function processFields() {

	var fieldConfig,
	    fieldPath,
	    fields,
	    i;

	fields = this.options.fields;

	if (!fields || typeof fields !== 'object') {
		return;
	}

	if (!Array.isArray(fields)) {
		fields = Object.keys(fields);
	}

	// Go over every given field in the array
	for (i = 0; i < fields.length; i++) {

		fieldPath = fields[i];

		if (!this.fields) {
			this.fields = {};
			this.queryFields = {};
		}

		this.addField(fieldPath);
		this.addField(fieldPath, this.queryFields);
	}
});

/**
 * Add the field in the given object under its alias
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.3.0
 */
DbQuery.setMethod(function addField(fieldPath, obj) {

	var associations = this.model.associations,
	    fieldConfig,
	    assoc;

	// If the fields object is false, all fields should be returned
	if (!this.fields) {
		return;
	}

	if (typeof fieldPath == 'string') {
		// Get the field config info
		fieldConfig = this.getFieldInfo(fieldPath, true);
	} else {
		fieldConfig = fieldPath;
	}

	// If the field required is from an associated model,
	// make sure the local key is also queried
	if (assoc = associations[fieldConfig.alias]) {

		if (assoc.alias == this.model.name) {
			log.warn('Trying to add alias with the same name as the current model: "' + assoc.alias + '"');
			return;
		}

		if (!this.fields[this.model.name] || !this.fields[this.model.name][assoc.options.localKey]) {
			this.addField(this.model.name + '.' + assoc.options.localKey);
		}
	}

	if (typeof obj === 'undefined') {
		obj = this.fields;

		// Also add it to the query field
		this.addQueryField(fieldConfig);
	}

	// Create an entry for this alias
	if (!obj[fieldConfig.alias]) {
		obj[fieldConfig.alias] = {};
	}

	obj[fieldConfig.alias][fieldConfig.field] = 1;
});


/**
 * Make sure the given field is queried (returned by mongo)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   fieldPath
 */
DbQuery.setMethod(function addQueryField(fieldPath) {
	this.addField(fieldPath, this.queryFields);
});

/**
 * Get field info from a field path string,
 * which can contain a model name and a field chain,
 * all joined by dots
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   path    eg: AclRule.settings.halt
 *
 * @return   {Object}
 */
DbQuery.setMethod(function getFieldInfo(path) {

	var model = this.model,
	    alias_model,
	    config,
	    alias;

	// Parse the path
	path = DbQuery.parseRecordPath(path);

	// Get the alias
	alias = path.alias || model.name;

	// Get the alias model
	alias_model = model.getAliasModel(alias);

	config = alias_model.getField(path.field);

	return {
		alias  : alias,
		model  : alias_model,
		table  : alias_model.table,
		field  : path.field,
		path   : path.path.join('.'),
		depth  : path.path.length - 1, // How deep we look in a field
		config : config || {}
	};
});

if (Blast.isNode) {
	global.DbQuery = DbQuery;
}