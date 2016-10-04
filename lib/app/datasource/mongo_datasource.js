var MongoClient = alchemy.use('mongodb').MongoClient,
    bson        = alchemy.use('bson').BSONPure.BSON;

/**
 * MongoDb Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
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
		uri += options.login + ':' + options.password + '@';
	}

	// Add the hostname/ip address & port
	uri += options.host + ':' + options.port;

	// Add the database
	uri += '/' + options.database + '?';

	// Store the uri
	this.uri = uri;

	// Set the connection options
	this.mongoOptions = {
		db: {
			native_parser: true
		}
	};

	// Cache collections in here
	this.collections = {};
});

/**
 * Get a connection to the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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
		MongoClient.connect(that.uri, that.mongoOptions, function connected(err, db) {

			if (err) {
				that.connectionError = err;
				log.error('Could not create connection to Mongo server', {err: err});
			} else {
				log.info('Created connection to Mongo datasource ' + String(that.name).bold);
			}

			that.connection = db;
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
 * @version  0.2.0
 */
Mongo.setMethod(function _read(model, query, _options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var options,
		    cursor

		if (err != null) {
			return callback(err);
		}

		options = Object.assign({}, _options);

		// Create the cursor
		cursor = collection.find(query, options);

		Function.parallel({
			available: function getAvailable(next) {

				if (options.available === false) {
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
 * @version  0.2.0
 */
Mongo.setMethod(function _update(model, data, options, callback) {

	this.collection(model.table, function gotCollection(err, collection) {

		var updateObject,
		    unset,
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

		// Remove fields that should not be updated
		delete doc._id;
		delete doc.created;

		// Set the updated field
		doc.updated = new Date();

		// Flatten the object
		flat = Object.flatten(doc);

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