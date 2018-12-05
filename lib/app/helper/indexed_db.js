var indexedDB;

// This is only meant for the client
if (Blast.isNode) {
	return;
}

indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

/**
 * The IndexedDb class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}  name
 * @param    {Number}  version
 */
var IndexedDb = Blast.Bound.Function.inherits('Alchemy.Base', function IndexedDb(name) {

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
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.6
 */
IndexedDb.setStatic('from_cache_symbol', Symbol('from_cache'));

/**
 * Initialize the connection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.4
 */
IndexedDb.setMethod(function init(version) {

	var that = this,
	    req;

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
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {String}   name
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
 * @author   Jelle De Loecker <jelle@develry.be>
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
 * Create something in a collection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     collection   The name of the collection
 * @param    {Object}     object
 * @param    {Function}   callback
 */
IndexedDb.setAfterMethod('ready', function create(collection, object, callback) {
	this.applyObjectstoreMethod(collection, 'add', [object], callback);
});

/**
 * Create or update something in a collection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     collection   The name of the collection
 * @param    {Object}     object
 * @param    {Function}   callback
 */
IndexedDb.setAfterMethod('ready', function put(collection, object, callback) {
	this.applyObjectstoreMethod(collection, 'put', [object], callback);
});

/**
 * Read from the collection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {String}     collection   The name of the collection
 * @param    {Object}     query        Query conditions (NOT DbQuery instance)
 * @param    {Object}     options
 * @param    {Function}   callback
 */
IndexedDb.setAfterMethod('ready', function read(collection, query, options, callback) {

	var that = this,
	    transaction,
	    context,
	    request,
	    result = [],
	    sort,
	    key;

	transaction = this.createTransaction([collection], 'readonly');

	transaction.onerror = function onerror(error_event) {
		callback(error_event);
	};

	// Get the object store
	obj_store = transaction.objectStore(collection);

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

	request.onsuccess = function onsuccess(event) {

		var cursor,
		    value,
		    doc;

		if (event) {
			cursor = event.target.result;
		}

		if (!cursor) {
			if (options.sort) {
				sort = [Blast.PATH_AGGREGATE];

				for (key in options.sort) {
					sort.push(options.sort[key]);
					sort.push(key);
				}

				result.sortByPath.apply(result, sort);
			}

			return callback(null, result);
		}

		if (cursor instanceof IDBCursor) {
			value = cursor.value;
		} else {
			value = cursor;
			cursor = null;
		}

		if (!query || Blast.Classes.Alchemy.DbQuery.match(value, query)) {
			doc = value;
			doc[IndexedDb.from_cache_symbol] = true;
			doc = JSON.undry(doc);

			result.push(doc);
		}

		if (cursor) {
			cursor.continue();
		} else {
			// Call this function again so the "no cursor" code will run
			onsuccess(null);
		}
	};
});

/**
 * Create a transaction
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Array}   stores
 * @param    {String}  type
 *
 * @return   {}
 */
IndexedDb.setMethod(function createTransaction(stores, type) {
	return this.connection.transaction(stores, type);
});

/**
 * Handle a transaction
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    collection   The name of the collection
 * @param    {String}    method       The name of the method to apply
 * @param    {Array}     args         The arguments to pass to the method
 * @param    {Function}  callback
 */
IndexedDb.setMethod(function applyObjectstoreMethod(collection, method, args, callback) {

	var transaction = this.createTransaction([collection], 'readwrite'),
	    obj_store,
	    request;

	transaction.onerror = function onerror(error_event) {
		callback(error_event);
	};

	// Get the object store
	obj_store = transaction.objectStore(collection);

	// Request adding the object
	request = obj_store[method].apply(obj_store, args);

	request.onsuccess = function onsuccess(event) {
		callback(null);
	};
});