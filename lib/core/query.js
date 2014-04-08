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
 */
GLOBAL.DbQuery = function DbQuery(model, options) {

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

	this.processFields();
};

/**
 * Start normalizing the conditions
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
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
 * Normalize the given group
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
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
		fieldConfig = that.getFieldInfo(fieldPath);

		// If it's a condition for the main model, just add it to the target
		if (fieldConfig.alias == that.model.modelName) {
			target[fieldConfig.path] = value;
			return;
		}

		if (!collections[fieldConfig.alias]) {
			collections[fieldConfig.alias] = {
				fieldConfig: fieldConfig,
				table: fieldConfig.table,
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

			// Get the collection table
			conn.collection(collection.table, function(err, table) {

				// Find the external ids
				table.find(collection.conditions, fields).toArray(function(err, items) {

					var ids  = [],
					    temp = {},
					    i;

					// Put these ids in an $and array
					if (!target.$and) {
						target.$and = [];
					}

					if (!items.length) {
						items.push('no_assoc_data_found');
					}

					for (i = 0; i < items.length; i++) {
						ids.push(items[i][assocKey]);
					}

					temp[localKey] = {$in: ids};

					target.$and.push(temp);

					next();
				});

			});

		};

	});

	// Now we'll handle subgroups
	Object.each(subgroups, function(subgroup, type) {

		tasks[tasks.length] = function(next) {

			var newTarget = {};

			that.normalizeGroup(type, newTarget, subgroup, function() {

				if (!target[type]) {
					target[type] = [];
				}

				target[type].push(newTarget);

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
 * @version  0.0.1
 */
DbQuery.prototype.sort = function sort() {

	var sort = this.options.sort,
	    aliasSort = {},
	    fieldInfo,
	    key,
	    val;

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
		fieldInfo = this.getFieldInfo(key);

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

		aliasSort[fieldInfo.alias][fieldInfo.field] = val;
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
 */
DbQuery.prototype.execute = function execute(callback) {
	
	var that = this;

	console.time('Execute query')

	this.normalize(function(err, conditions) {

		that.connection.collection(that.model.useTable, function(err, table) {

			table.find(conditions).toArray(function(err, items) {

				console.timeEnd('Execute query')

				//pr(items)

			});

		});

		pr(conditions, true);

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
	    i;

	// Go over every given field in the array
	for (i = 0; i < this.options.fields.length; i++) {

		fieldPath = this.options.fields[i];

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
		fieldConfig = this.getFieldInfo(fieldPath);
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
 * @version  0.0.1
 *
 * @param    {String}   path    eg: AclRule.settings.halt
 *
 * @return   {Object}
 */
DbQuery.prototype.getFieldInfo = function getFieldInfo(path) {

	var pieces = path.split('.'),
	    model  = this.model,
	    fieldPath,
	    modelName,
	    config,
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

	if (model.aliasAssociations[alias] && model.aliasAssociations[alias].modelName) {
		table = model.aliasAssociations[alias].modelName.tableize();
	} else {
		table = alias.tableize();
	}

	if (model && model.blueprint) {
		config = model.blueprint[pieces[0]];
	}

	// The field is the first part of the pieces
	field = pieces[0];

	// Construct the field path based on the rest of the array
	fieldPath = pieces.join('.');

	return {
		alias: alias,
		table: table,
		field: field,
		path: fieldPath,
		depth: pieces.length-1, // How deep we look in a field
		config: config || {}
	};
};