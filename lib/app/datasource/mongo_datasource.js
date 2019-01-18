var MongoClient = alchemy.use('mongodb').MongoClient;

/**
 * MongoDb Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var Mongo = Function.inherits('Alchemy.Datasource', function MongoDatasource(name, _options) {

	var options,
	    uri;

	// Caught connection err
	this.connection_error = null;

	// Define default options
	this.options = {
		host: '127.0.0.1',
		database: null,
		login: null,
		password: null,
		port: 27017
	};

	MongoDatasource.super.call(this, name, _options);
	options = this.options;

	// Allow fully-formed uris
	if (options.uri) {
		uri = options.uri;
	} else {
		uri = 'mongodb://';

		// Add login & password to the uri if they're supplied
		if (options.login && options.password) {
			uri += encodeURIComponent(options.login) + ':' + encodeURIComponent(options.password) + '@';
		}

		// Add the hostname/ip address & port
		uri += options.host + ':' + options.port;

		// Add the database
		uri += '/' + options.database + '?';
	}

	// Store the uri
	this.uri = uri;

	// Set the connection options
	this.mongoOptions = {
		// Retry to connect the maximum number of times
		reconnectTries    : Number.MAX_VALUE,

		// Wait 1.5 seconds before retrying
		reconnectInterval : 1500,

		// Use the new url parser, because otherwise it logs a warning
		useNewUrlParser   : true
	};

	// Cache collections in here
	this.collections = {};
});

// Indicate this datasource supports objectids
Mongo.setSupport('objectid', true);

// Indicate this datasource supports querying associations
Mongo.setSupport('querying_associations', true);

/**
 * Get find options for the MongoDB server
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Mongo.setProperty('allowed_find_options', [
	'limit',
	'sort',
	'projection',
	'fields',
	'skip',
	'hint',
	'explain',
	'snapshot',
	'timeout',
	'tailable',
	'batchSize',
	'returnKey',
	'maxScan',
	'min',
	'max',
	'showDiskLoc',
	'comment',
	'raw',
	'promoteLongs',
	'promoteValues',
	'promoteBuffers',
	'readPreference',
	'partial',
	'maxTimeMS',
	'collation',
	'session'
]);

/**
 * Get find options for the MongoDB server
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Mongo.setMethod(function normalizeFindOptions(options) {

	var result = {},
	    key;

	if (!options) {
		return result;
	}

	for (key in options) {
		if (this.allowed_find_options.indexOf(key) == -1) {
			continue;
		}

		result[key] = options[key];
	}

	return result;
});

/**
 * Get a connection to the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Mongo.decorateMethod(Blast.Decorators.memoize({ignore_arguments: true}), function connect() {

	if (this.connection) {
		return Pledge.resolve(this.connection);
	}

	if (this.connection_error) {
		return Pledge.reject(this.connection_error);
	}

	let that = this,
	    pledge = new Pledge();

	// Create the connection to the database
	MongoClient.connect(that.uri, that.mongoOptions, function connected(err, client) {

		if (err) {
			that.connection_error = err;
			alchemy.printLog(alchemy.SEVERE, 'Could not create connection to Mongo server', {err: err});
			return pledge.reject(err);
		} else {
			log.info('Created connection to Mongo datasource', that.name);
		}

		if (client) {
			that.mongo_client = client;
			that.connection = client.db();
		}

		pledge.resolve(client);
	});

	return pledge;
});

/**
 * Get a mongodb collection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Function}   callback
 */
Mongo.setMethod(function collection(name, callback) {

	var that = this;

	if (this.collections[name]) {
		setImmediate(function cachedCollection() {
			callback(null, that.collections[name]);
		});

		return;
	}

	this.connect().done(function gotConnection(err, db) {

		if (err) {
			return callback(err);
		}

		that.connection.collection(name, function createdCollection(err, collection) {

			if (err) {
				return callback(err);
			}

			// Cache the collection
			that.collections[name] = collection;

			// Return it to the callback
			callback(null, collection);
		});
	});
});

/**
 * Compile criteria into a MongoDB query object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Object}
 */
Mongo.setMethod(function compileCriteria(criteria) {

	var assoc_model,
	    aggregate,
	    result = [],
	    entry,
	    assoc,
	    temp,
	    i;

	for (i = 0; i < criteria.group.items.length; i++) {
		entry = criteria.group.items[i];

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
				assoc_model = Model.get(assoc.modelName);

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
			let compiled_group = entry.criteria.compile(),
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
					obj = {$in: item.value};
				} else if (item.type == 'gt' || item.type == 'gte' || item.type == 'lt' || item.type == 'lte') {
					obj['$' + item.type] = item.value;
				} else if (item.type == 'exists') {
					if (item.value || item.value == null) {
						obj.$exists = true;
					} else {
						obj.$exists = false;
					}
				} else {
					throw new Error('Unknown criteria expression: "' + item.type + '"');
				}

				if (not) {
					not = false;
					obj = {$not: obj};
				}

				let field_entry = {},
				    name = entry.target_path;

				if (entry.association) {
					name = entry.association + '.' + name;
				}

				field_entry[name] = obj;

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
Mongo.setMethod(function compileCriteriaOptions(criteria) {

	var result = {},
	    fields = criteria.getFieldsToSelect();

	if (fields.length) {
		result.fields = fields;
	} else {
		result.fields = null;
	}

	if (criteria.options.sort) {
		result.sort = criteria.options.sort;
	}

	if (criteria.options.skip) {
		result.offset = criteria.options.skip;
	}

	if (criteria.options.limit) {
		result.limit = criteria.options.limit;
	}

	return result;
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Mongo.setMethod(function _read(model, criteria, callback) {

	var that = this;

	this.collection(model.table, async function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		let compiled,
		    options;

		compiled = await that.compileCriteria(criteria);
		options = that.compileCriteriaOptions(criteria);

		if (compiled.pipeline) {

			collection.aggregate(compiled.pipeline, {}, function gotAggregate(err, cursor) {

				if (err) {
					return callback(err);
				}

				cursor.toArray(function gotArray(err, items) {

					if (err) {
						return callback(err);
					}

					items = that.organizeResultItems(model, items);

					callback(null, items);
				});
			});

			return;
		}

		// Create the cursor
		let cursor = collection.find(compiled, options);

		Function.parallel({
			available: function getAvailable(next) {

				if (criteria.options.available === false) {
					return next(null, null);
				}

				cursor.count(false, next);
			},
			items: function getItems(next) {
				cursor.toArray(next);
			}
		}, function done(err, data) {

			if (err) {
				return callback(err);
			}

			data.items = that.organizeResultItems(model, data.items);

			callback(err, data.items, data.available);
		});
	});
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
Mongo.setMethod(function organizeResultItems(model, rows) {

	var associations = model.associations,
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

/**
 * Create a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Mongo.setMethod(function _create(model, data, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		collection.insert(data, {w: 1, fullResult: true}, function afterInsert(err, result) {

			// Clear the cache
			model.nukeCache();

			if (err != null) {
				return callback(err, result);
			}

			callback(null, Object.assign({}, data));
		});
	});
});

/**
 * Update a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Mongo.setMethod(function _update(model, data, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var updateObject,
		    no_flatten,
		    to_flatten,
		    unset,
		    field,
		    flat,
		    doc,
		    key,
		    id;

		if (err != null) {
			return callback(err);
		}

		// Get the id to update, it should always be inside the given data
		id = data._id;

		// Clone the data object
		doc = Object.assign({}, data);

		// Values that will get flattened
		to_flatten = {};

		// Field names that won't get flattened
		no_flatten = {};

		// Remove fields that should not be updated
		delete doc._id;

		if (!options.override_created) {
			delete doc.created;
		}

		// Iterate over the fields
		for (key in doc) {
			field = model.getField(key);

			if (field && field.is_self_contained) {
				no_flatten[key] = doc[key];
			} else {
				to_flatten[key] = doc[key];
			}
		}

		// Flatten the object, using periods & NOT flattening arrays
		flat = Object.flatten(to_flatten, '.', false);

		// Assign the no-flatten values, too
		Object.assign(flat, no_flatten);

		unset = {};

		for (key in flat) {
			// Undefined or null means we want to delete the value
			// We can't set null, because that could interfere with dot notation updates
			if (flat[key] == null) {

				// Add the key to the unset object
				unset[key] = '';

				// Remove it from the flat object
				delete flat[key];
			}
		}

		updateObject = {
			$set: flat
		};

		if (!Object.isEmpty(unset)) {
			updateObject.$unset = unset;
		}

		if (options.debug) {
			console.log('Updating with obj', id, updateObject);
		}

		if (collection.findAndModify) {
			collection.findAndModify({_id: id}, [['_id', 1]], updateObject, {upsert: true}, afterUpdate);
		} else {
			// If it's not available (like nedb)
			collection.update({_id: ''+id}, updateObject, {upsert: true}, afterUpdate);
		}

		function afterUpdate(err, result) {

			// Clear the cache
			model.nukeCache();

			if (err != null) {
				return callback(err, result);
			}

			callback(null, Object.assign({}, data));
		}
	});
});

/**
 * Remove a record from the database
 *
 * @author   Kjell Keisse   <kjell@codedor.be>
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.3
 */
Mongo.setMethod(function _remove(model, query, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		collection.findOneAndDelete(query, function _deleted(err, result){

			//clear cache
			model.nukeCache();

			if (err != null) {
				return callback(err, result);
			}

			callback(null, !!result);
		});
	});
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Mongo.setMethod(function _ensureIndex(model, index, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var options,
		    obj,
		    key;

		if (err != null) {
			return callback(err);
		}

		options = {
			name: index.options.name
		};

		if (index.options.unique) {
			options.unique = true;
		}

		if (index.options.sparse) {
			options.sparse = true;
		}

		// Hack in the text indexes
		if (options.name == 'text') {
			obj = {};

			for (key in index.fields) {
				obj[key] = 'text';
			}

			collection.ensureIndex(obj, options, callback);
		} else {
			collection.ensureIndex(index.fields, options, callback);
		}
	});
});