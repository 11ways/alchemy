module.exports = function IndexedDbHelper(Hawkejs, Blast) {

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
	 * Initialize the connection
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	IndexedDb.setMethod(function init(version) {

		var that = this,
		    req;

		// Open the database
		req = indexedDB.open(this.name, version);

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
	 * @version  1.0.0
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
	 * @param    {Object}     object
	 * @param    {Function}   callback
	 */
	IndexedDb.setAfterMethod('ready', function put(collection, object, callback) {
		this.applyObjectstoreMethod(collection, 'put', [object], callback);
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

};