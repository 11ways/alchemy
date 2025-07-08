var indexedDB;

// This is only meant for the client
if (Blast.isNode) {
	return;
}

indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

/**
 * The IndexedDb class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {string}  name
 * @param    {number}  version
 */
var IndexedDb = Blast.Bound.Function.inherits('Informer', function IndexedDb(name) {

	// The database name
	this.name = name;

	// The actual database connection
	this.connection = null;

	// The current version
	this.version = null;

	// Open the db
	this.init();
});

/**
 * Symbol to use for seeing when something is from cache
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.0.6
 */
IndexedDb.setStatic('from_cache_symbol', Symbol('from_cache'));

/**
 * Initialize the connection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 */
IndexedDb.setMethod(function init(version) {

	var that = this,
	    req;

	if (this.request) {
		this.unsee('ready');
	}

	// Open the database
	if (version != null) {
		req = indexedDB.open(this.name, version);
	} else {
		req = indexedDB.open(this.name);
	}

	// Store the open request
	this.request = req;

	// Remember we are initing
	this.initing = true;

	// Listen for needed upgrades
	req.onupgradeneeded = function onNeeded(e) {
		that.connection = req.result;
		that.initing = false;
		that.emit('upgradeneeded');
	};

	// Listen for success
	req.onsuccess = function onSuccess(e) {
		that.initing = false;
		that.connection = req.result;
		that.version = that.connection.version;
		that.emit('ready');
	};

	// Listen for errors
	req.onerror = function onError(e) {
		console.log('IDB Error:', e);
	};
});

/**
 * Modify an object store.
 * Only runs after the first `ready` event,
 * because we need the database's version
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {string}   name
 * @param    {Function} callback
 */
IndexedDb.setAfterMethod('ready', function modifyObjectStore(name, callback) {

	var that = this,
	    new_version;

	if (typeof callback != 'function') {
		throw new Error('Need a function to modify the object store');
	}

	// Execute the callback as soon as the upgradeneeded event is fired
	this.once('upgradeneeded', function gotUpgradeNeededEvent(e) {

		// Always create the store ourselves with an _id as key
		var store;

		// If the store doesn't exist yet, create it now!
		if (!that.connection.objectStoreNames.contains(name)) {
			store = that.connection.createObjectStore(name, {keyPath: '_id'});

			store.createIndex('created',           'created.timestamp',   {unique: false});
			store.createIndex('updated',           'updated.timestamp',   {unique: false});
			store.createIndex('needs_remote_save', '_$needs_remote_save', {unique: false});
			store.createIndex('local_save_time',   '_$local_save_time',   {unique: false});
			store.createIndex('remote_save_time',  '_$remote_save_time',  {unique: false});
		} else {
			// Get the existing object store
			store = that.request.transaction.objectStore(name);
		}

		callback.call(that, null, store);
	});

	// Re-open the database with the higher version if it's not happening already
	if (!this.initing) {
		this.connection.close();
		new_version = this.version + 1;
		this.init(new_version);
	}
});

/**
 * See if this store exists
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
IndexedDb.setAfterMethod('ready', function hasStore(name, callback) {

	if (!this.connection.objectStoreNames.contains(name)) {
		return callback(null, false);
	}

	return callback(null, true);
});

/**
 * See if this store has an index exists
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
IndexedDb.setAfterMethod('ready', function hasIndex(collection_name, index_name, callback) {

	if (!this.connection.objectStoreNames.contains(collection_name)) {
		return callback(null, false);
	}

	let transaction = this.createTransaction([collection_name], 'readonly'),
	    obj_store = transaction.objectStore(collection_name),
	    index;

	try {
		index = obj_store.index(index_name);
	} catch (err) {
		return callback(null, false);
	}

	return callback(null, true);
});

/**
 * Create the given index
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 */
IndexedDb.setAfterMethod('ready', function createIndex(collection_name, index_name, options, callback) {

	const that = this;
	let pledge = new Pledge();
	pledge.done(callback);

	this.modifyObjectStore('records', function doChanges(err, store) {

		if (err) {
			return pledge.reject(err);
		}

		let fields = [],
		    key;

		for (key in options.fields) {
			fields.push(key);
		}

		if (fields.length == 1) {
			fields = fields[0];
		}

		that.applyObjectstoreMethod(collection_name, 'createIndex', [fields, {
			unique: options.options.unique || false
		}], pledge.getResolverFunction());
	});
});

/**
 * Create something in a collection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {string}     collection   The name of the collection
 * @param    {Object}     object
 * @param    {Function}   callback
 */
IndexedDb.setAfterMethod('ready', function create(collection, object, callback) {

	const that = this;
	let pledge = new Pledge();
	pledge.done(callback);

	this.applyObjectstoreMethod(collection, 'add', [object], function done(err, event) {

		if (err) {
			return pledge.reject(err);
		}

		let _id = event.srcElement.result;

		that.read(collection, {_id: _id}, {}, pledge.getResolverFunction());
	});

	return pledge;
});

/**
 * Create or update something in a collection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 *
 * @param    {string}     collection   The name of the collection
 * @param    {Object}     object
 * @param    {Function}   callback
 */
IndexedDb.setAfterMethod('ready', function put(collection, object, callback) {

	const that = this;
	let pledge = new Pledge();
	pledge.done(callback);

	this.applyObjectstoreMethod(collection, 'put', [object], function done(err, event) {

		if (err) {
			return pledge.reject(err);
		}

		let _id = event.srcElement.result;

		that.read(collection, {_id: _id}, {}, pledge.getResolverFunction());
	});

	return pledge;
});

/**
 * Read from the collection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 *
 * @param    {string}     collection   The name of the collection
 * @param    {Object}     query        Query conditions (NOT DbQuery instance)
 * @param    {Object}     options
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
IndexedDb.setAfterMethod('ready', function read(collection, query, options, callback) {

	let pledge = new Pledge(),
	    context,
	    request;

	pledge.done(callback);

	let transaction = this.createTransaction([collection], 'readonly');
	transaction.onerror = error_event => pledge.reject(error_event);

	// Get the object store
	let obj_store = transaction.objectStore(collection);

	// If an _id is given, we can use a simple get transaction
	if (query && query._id) {
		request = obj_store.get(query._id);
	} else {
		if (options.use_index) {
			context = obj_store.index(options.use_index);
		} else {
			context = obj_store;
		}

		request = context.openCursor();
	}

	let config = {
		result   : [],
		sort     : null,
		query    : query,
		options  : options,
		callback : pledge.getResolverFunction(),
	};

	request.onsuccess = event => idbOnSuccess(event, config);

	return pledge;
});

/**
 * IDB On success read function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 */
function idbOnSuccess(event, config) {

	var result = config.result,
	    cursor;

	if (event) {
		cursor = event.target.result;
	}

	if (!cursor) {
		const options = config.options;

		if (options.sort) {
			let key;
			config.sort = [Blast.PATH_AGGREGATE];

			for (key in options.sort) {
				config.sort.push(options.sort[key]);
				config.sort.push(key);
			}

			result.sortByPath.apply(result, config.sort);
		}

		let available = result.length;

		if (options && options.limit) {
			result = result.slice(0, options.limit);
		}

		return config.callback(null, result, available);
	}

	let value;

	if (cursor.source != null && cursor instanceof IDBCursor) {
		value = cursor.value;
	} else {
		value = cursor;
		cursor = null;
	}

	if (!config.query || Classes.Alchemy.Datasource.Nosql.match(value, config.query)) {
		let doc = value;
		doc[IndexedDb.from_cache_symbol] = true;

		result.push(doc);
	}

	if (cursor) {
		cursor.continue();
	} else {
		// Call this function again so the "no cursor" code will run
		idbOnSuccess(null, config);
	}
};

/**
 * Create a transaction
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Array}   stores
 * @param    {string}  type
 *
 * @return   {}
 */
IndexedDb.setMethod(function createTransaction(stores, type) {

	var transaction = this.connection.transaction(stores, type);

	this._current_transaction = transaction;

	return transaction;
});

/**
 * Handle a transaction
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 *
 * @param    {string}    collection   The name of the collection
 * @param    {string}    method       The name of the method to apply
 * @param    {Array}     args         The arguments to pass to the method
 * @param    {Function}  callback
 */
IndexedDb.setMethod(function applyObjectstoreMethod(collection, method, args, callback) {

	let transaction = this.createTransaction([collection], 'readwrite');

	transaction.onerror = function onerror(error_event) {
		callback(error_event);
	};

	// Get the object store
	let obj_store = transaction.objectStore(collection);

	// Request adding the object
	let request = obj_store[method].apply(obj_store, args);

	request.onsuccess = function onsuccess(event) {
		callback(null, event);
	};
});