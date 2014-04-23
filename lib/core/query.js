var util      = alchemy.use('util'),
    async     = alchemy.use('async'),
    prefixes  = alchemy.shared('Routing.prefixes'),
    Private   = {};

/**
 * The DbQuery class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param    {Model}    model      The originating model
 * @param    {Object}   options    The find options
 * @param    {Number}   level      The current level (associated model)
 */
GLOBAL.DbQuery = function DbQuery(model, options, level) {

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
	this.sort = false;

	// Possible errors
	this.error = false;

	// Store the current recursive level
	this.level = level || 0;

	// Store how deep we can go
	this.recursive = options.recursive;

	this.processFields();

	this.processSort();
};

/**
 * Normalize the conditions by fetching associated data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
DbQuery.prototype.normalize = function normalize(callback) {

	var that       = this,
	    tasks      = [],
	    normalized = {};

	this.normalizeGroup('$and', normalized, this.options.conditions, function() {
		callback(null, normalized);
	});
};

/**
 * Make sure a condition value is of the correct type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
DbQuery.prototype.castValue = function castValue(value, type) {

	var array = Array.isArray(value),
	    castVal,
	    result,
	    i;

	type = String(type).toLowerCase();

	if (type == 'objectid') {

		// Always turn objectids into arrays (to look for string values)
		result = [];

		if (array) {
			for (i = 0; i < value.length; i++) {
				castVal = alchemy.castObjectId(value[i]);

				if (castVal) {
					result.push(castVal);
					result.push(''+castVal);
				}
			}
		} else {
			castVal = alchemy.castObjectId(value);

			if (castVal) {
				result.push(castVal);
				result.push(''+castVal);
			}
		}

		array = true;
	} else {
		result = value;
	}

	if (array) {
		result = {$in: result};
	}

	return result;
};

/**
 * Normalize the given group
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
DbQuery.prototype.normalizeGroup = function normalizeGroup(type, target, conditions, callback) {

	var that  = this,
	    tasks = [],
	    collections  = {},
	    subgroups    = {};

	// Handle array of conditions
	if (Array.isArray(conditions)) {

		conditions.forEach(function(obj, index) {
			tasks[tasks.length] = function(next) {

				var temp = {};

				that.normalizeGroup('$and', temp, obj, function() {
					next(null, temp);
				});
			};
		});

		async.parallel(tasks, function(err, arr) {

			if (!target[type]) {
				target[type] = [];
			}

			target[type] = target[type].concat(arr);

			callback();
		});

		return;
	}

	// Group by collections first
	Object.each(conditions, function(value, fieldPath) {

		var fieldConfig;

		// If it's a subgroup, save it for later
		if (fieldPath[0] === '$') {
			subgroups[fieldPath] = value;
			return;
		}

		// Get field config information
		fieldConfig = that.getFieldInfo(fieldPath, true);

		value = that.castValue(value, fieldConfig.config.type);

		// If it's a condition for the main model, just add it to the target
		if (fieldConfig.alias == that.model.modelName) {
			target[fieldConfig.path] = value;
			return;
		}

		if (!collections[fieldConfig.alias]) {
			collections[fieldConfig.alias] = {
				fieldConfig: fieldConfig,
				table: fieldConfig.table,
				model: fieldConfig.model,
				conditions: {}
			};
		}

		// Add it to the collections conditions
		collections[fieldConfig.alias].conditions[fieldConfig.path] = value;
	});

	// Now we'll handle the external collections
	Object.each(collections, function(collection, alias) {

		tasks[tasks.length] = function(next) {

			var conn   = that.model.connection,
			    config = that.model.aliasAssociations[alias],
			    fields = {},
			    assocKey,
			    localKey;

			// See which field we need to get
			switch (config.type) {

				case 'hasOneParent':
				case 'hasAndBelongsToMany':
				case 'belongsTo':
					assocKey = '_id';
					localKey = config.foreignKey;
					break;

				case 'hasMany':
				case 'hasOneChild':
					assocKey = config.foreignKey;
					localKey = '_id';
					break;

				default:
					log.error('Still need to implement ' + config.type);
			}

			// Indicate we only want the associate field value
			fields[assocKey] = 1;

			collection.model.queryCollection(collection.conditions, {fields: fields}, function(err, items) {

				var ids  = [],
				    temp = {},
				    i;

				// Put these ids in an $and array
				if (!target.$and) {
					target.$and = [];
				}

				if (!items.length) {
					ids.push('no_assoc_data_found');
				} else {
					for (i = 0; i < items.length; i++) {
						ids.push(items[i][assocKey]);
					}
				}

				temp[localKey] = {$in: ids};

				target.$and.push(temp);

				next();

			});
		};
	});

	if (this.error) {
		return callback(this.error);
	}

	// Now we'll handle subgroups
	Object.each(subgroups, function(subgroup, type) {

		tasks[tasks.length] = function(next) {

			var newTarget = {};

			that.normalizeGroup(type, newTarget, subgroup, function() {

				var key,
				    obj;

				if (!target[type]) {
					target[type] = [];
				}

				for (key in newTarget) {
					
					obj = {};
					obj[key] = newTarget[key];

					target[type].push(obj);
				}

				next();
			});

		};

	});

	// Execute all the finds
	async.parallel(tasks, function() {
		callback();
	});
};

/**
 * Process the sort options
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
DbQuery.prototype.processSort = function processSort() {

	var sort = this.options.sort,
	    aliasSort = {},
	    fieldInfo,
	    prefixes,
	    name,
	    temp,
	    key,
	    val,
	    i;

	if (Array.isArray(sort)) {
		temp = sort;
		sort = {};

		for (i = 0; i < temp.length; i++) {
			sort[temp[i]] = 1;
		}
	}

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
		fieldInfo = this.getFieldInfo(key, true);

		// If it's a translatable field we'll need to sort by a dot-notation path
		if (fieldInfo.config && fieldInfo.config.translatable && this.model.render) {

			prefixes = [this.model.render.prefix];
			prefixes = prefixes.concat(this.model.render.fallback);

			name = [];

			for (i = 0; i < prefixes.length; i++) {
				name.push(fieldInfo.field + '.' + prefixes[i]);
			}
		} else {
			name = [fieldInfo.field];
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
	if (alchemy.isEmpty(aliasSort)) {
		sort = false;
	} else {
		sort = aliasSort;
	}

	this.sort = sort;
};

/**
 * Execute the query
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Function}   callback
 */
DbQuery.prototype.execute = function execute(callback) {
	
	var that  = this,
	    tasks = [];

	if (this.error) {
		return callback(this.error);
	}

	// Normalize the conditions by getting associated data
	this.normalize(function(err, conditions) {

		var options = {},
		    associations = {},
		    alias;

		if (that.error) {
			return callback(that.error)
		}

		// Limit the amount of fields returned if the fields object has been set
		if (that.fields && that.fields[that.model.modelName]) {
			options.fields = that.fields[that.model.modelName];

			for (alias in that.fields) {
				if (that.model.aliasAssociations[alias]) {
					associations[alias] = that.model.aliasAssociations[alias];
				}
			}
		} else {
			associations = that.model.aliasAssociations;
		}

		// Sort the results
		if (that.sort && that.sort[that.model.modelName]) {
			options.sort = that.sort[that.model.modelName];
		}

		if (that.options.limit > 0) {
			options.limit = that.options.limit;
		}

		if (that.options.offset > 0) {
			options.skip = that.options.offset;
		}

		options.available = that.options.available;

		// Query the main model
		that.model.queryCollection(conditions, options, function(err, items, available) {

			// Get associated data
			items.every(function(item, index) {

				// Don't look for more data than allowed
				if (that.level > that.recursive) {
					return false;
				}

				// Go over every item
				tasks[tasks.length] = function(nextItem) {

					var aliases = {};

					// Prepare the functions for fetching associated data
					Object.each(associations, function(association, alias) {
						aliases[alias] = function(nextAlias) {
							
							var assocModel = that.model.getModel(association.modelName),
							    assocOpts  = {},
							    condition  = {},
							    assocKey,
							    localKey;

							switch (association.type) {

								case 'hasOneParent':
								case 'hasAndBelongsToMany':
								case 'belongsTo':
									assocKey = '_id';
									localKey = association.foreignKey;
									break;

								case 'hasMany':
								case 'hasOneChild':
									assocKey = association.foreignKey;
									localKey = '_id';
									break;

								default:
									log.error('Still need to implement ' + association.type);
							}

							condition[assocKey] = alchemy.castObjectId(item[localKey]) || 'impossible';

							// Don't get the available count
							assocOpts.available = false;

							// If fields have been provided, add them
							if (that.fields && that.fields[alias]) {
								assocOpts.fields = that.fields[alias];
							}

							// Sort the results
							if (that.sort && that.sort[alias]) {
								assocOpts.sort = that.sort[alias];
							}

							assocOpts.recursive = that.recursive - 1;
							assocOpts.conditions = condition;

							assocModel.find('all', assocOpts, function(err, assocItems) {

								var result = [],
								    item,
								    temp,
								    i;

								for (i = 0; i < assocItems.length; i++) {
									item = assocItems[i];

									// Get the associated model's main resultset
									temp = item[assocModel.modelName];

									// Remove the main resultset from the original item
									delete item[assocModel.modelName];

									// Inject it back into the item
									item = alchemy.inject(temp, item);

									// Add it to the resultset
									result.push(item);
								}

								switch (association.type) {
									case 'hasOneParent':
									case 'hasOneChild':
									case 'belongsTo':
									case 'hasOne':
										result = result[0];
										break;
								}

								nextAlias(err, result);
							});
						};
					});

					// Get the associated data through async
					async.parallel(aliases, function(err, record) {

						// Add the main model data to the record
						record[that.model.modelName] = item;
						
						nextItem(err, record);
					});
				};

				return true;
			});

			// Get the associated data for each item
			async.parallel(tasks, function(err, result) {

				// Set the available count
				result.available = available;

				callback(err, result);
			});
		});
	});
};

/**
 * If the field option has been provided,
 * limit the fields returned
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
DbQuery.prototype.processFields = function processFields() {

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
};

/**
 * Add the field in the given object under its alias
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
DbQuery.prototype.addField = function addField(fieldPath, obj) {

	var fieldConfig;

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
};


/**
 * Make sure the given field is queried (returned by mongo)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   fieldPath
 */
DbQuery.prototype.addQueryField = function addQueryField(fieldPath) {
	this.addField(fieldPath, this.queryFields);
};

/**
 * Get field info from a field path string,
 * which can contain a model name and a field chain,
 * all joined by dots
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param    {String}   path    eg: AclRule.settings.halt
 *
 * @return   {Object}
 */
DbQuery.prototype.getFieldInfo = function getFieldInfo(path, reportError) {

	var pieces = path.split('.'),
	    model  = this.model,
	    aliasModel,
	    fieldPath,
	    modelName,
	    config,
	    error,
	    table,
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

	// Get the model of the alias
	if (model.aliasAssociations[alias] && model.aliasAssociations[alias].modelName) {
		aliasModel = Model.get(model.aliasAssociations[alias].modelName);
	} else if (alias == model.modelName) {
		aliasModel = model;
	} else {
		aliasModel = Model.get(alias);
		error = alchemy.createError('Alias "' + alias + '" is not an association of ' + model.modelName);

		if (reportError) {
			if (!this.error) {
				this.error = [];
			}

			this.error.push(error);
		}
	}

	table = aliasModel.useTable;

	if (model && model.blueprint) {
		config = model.blueprint[pieces[0]];
	}

	// The field is the first part of the pieces
	field = pieces[0];

	// Construct the field path based on the rest of the array
	fieldPath = pieces.join('.');

	return {
		alias: alias,
		model: aliasModel,
		table: table,
		field: field,
		path: fieldPath,
		depth: pieces.length-1, // How deep we look in a field
		config: config || {},
		error: error
	};
};