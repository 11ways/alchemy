var MongoClient = alchemy.use('mongodb').MongoClient;

/**
 * MongoDb Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 */
var Mongo = Function.inherits('Alchemy.Datasource', function MongoDatasource(name, _options) {

	var options,
	    uri;

	// Hinder object for creating a single mongo connection
	this.hinder = null;

	// Caught connection err
	this.connectionError = null;

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

	uri = 'mongodb://';

	// Add login & password to the uri if they're supplied
	if (options.login && options.password) {
		uri += encodeURIComponent(options.login) + ':' + encodeURIComponent(options.password) + '@';
	}

	// Add the hostname/ip address & port
	uri += options.host + ':' + options.port;

	// Add the database
	uri += '/' + options.database + '?';

	// Store the uri
	this.uri = uri;

	// Set the connection options
	this.mongoOptions = {
		// Retry to connect the maximum number of times
		reconnectTries    : Number.MAX_VALUE,

		// Wait 1.5 seconds before retrying
		reconnectInterval : 1500
	};

	// Cache collections in here
	this.collections = {};
});

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
 * @version  1.0.0
 *
 * @param    {Function}   callback
 */
Mongo.setMethod(function connect(callback) {

	var that = this;

	function cachedConnection() {
		if (callback) callback(that.connectionError, that.connection);
	}

	if (this.connection || this.connectionError) {
		return setImmediate(cachedConnection);
	}

	if (this.hinder) {
		return this.hinder.push(cachedConnection);
	}

	this.hinder = Function.hinder(function createConnection(done) {

		// Create the connection to the database
		MongoClient.connect(that.uri, that.mongoOptions, function connected(err, client) {

			if (err) {
				that.connectionError = err;
				alchemy.printLog(alchemy.SEVERE, 'Could not create connection to Mongo server', {err: err});
			} else {
				log.info('Created connection to Mongo datasource', that.name);
			}

			that.mongo_client = client;
			that.connection = client.db();

			done();
		});
	});

	this.hinder.push(cachedConnection);
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

	this.connect(function gotConnection(err, db) {

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
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Mongo.setMethod(function _read(model, query, _options, callback) {

	var that = this;

	this.collection(model.table, function gotCollection(err, collection) {

		var options,
		    cursor,
		    key;

		if (err != null) {
			return callback(err);
		}

		options = that.normalizeFindOptions(_options);

		// Create the cursor
		cursor = collection.find(query, options);

		Function.parallel({
			available: function getAvailable(next) {

				if (_options.available === false) {
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

			callback(err, data.items, data.available);
		});
	});
});

/**
 * Update a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
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

			if (field && field.datatype == 'object') {
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
 * @since    0.2.0
 * @version  0.2.0
 */
Mongo.setMethod(function _remove(model, query, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		collection.findAndRemove(query, function(err, result){

			//clear cache
			model.nukeCache();

			if (err != null) {
				return callback(err, result);
			}

			callback(null, result);

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