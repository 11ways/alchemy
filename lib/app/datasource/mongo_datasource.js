var MongoClient = alchemy.use('mongodb').MongoClient;

/**
 * MongoDb Datasource
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Mongo = Function.inherits('Datasource', function MongoDatasource(name, _options) {

	var options,
	    uri;

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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}   callback
 */
Mongo.setMethod(function connect(callback) {

	var that = this;

	if (this.connection) {
		setImmediate(function cachedConnection() {
			callback(null, that.connection);
		});

		return;
	}

	// Create the connection to the database
	MongoClient.connect(this.uri, this.mongoOptions, function connected(err, db) {

		if (err) {
			return callback(err);
		}

		log.info('Created connection to datasource ' + String(that.name).bold);

		that.connection = db;

		if (callback) {
			callback(null, db);
		}
	});
});

/**
 * Get a mongodb collection
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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

		that.connection.createCollection(name, function createdCollection(err, collection) {

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