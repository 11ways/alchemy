var MongoClient = alchemy.use('mongodb').MongoClient,
    Fuery       = alchemy.use('fuery'),
    async       = alchemy.use('async');

/**
 * Database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
alchemy.create(function Database() {

	var own = {};

	/**
	 * Set up the database connection
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}   config
	 */
	this.init = function init(config, name) {

		var uri         = 'mongodb://';

		this.name = name;

		// Create a new pausable queue
		this.queue = new Fuery();

		// Set the correct context
		this.queue.setContext(this);

		// Add login & password to the uri if they're supplied
		if (config.login && config.password) {
			uri += config.login + ':' + config.password + '@';
		}

		// Add the hostname/ip address & port
		uri += config.host + ':' + config.port || 27017;

		// Add the database
		uri += '/' + config.database + '?';

		// Store the uri
		this.uri = uri;

		// Set the connection options
		this.options = {
			db: {
				native_parser: true
			}
		};

		// Cache the found collections
		this.cache = {};

		this.connect();
	};

	/**
	 * Actually make the connection
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Function}   callback
	 */
	this.connect = function connect(callback) {
		
		var that = this;

		// Create the connection to the database
		MongoClient.connect(this.uri, this.options, function(err, db) {

			if (err) {
				throw alchemy.createError('Could not create connection to datasource ' + that.name);
			} else {
				log.info('Created connection to datasource ' + String(that.name).bold);
			}

			that.db = db;
			that.connected = true;

			// Start the queue
			that.queue.start();

			if (callback) {
				callback();
			}
		});
	};

	/**
	 * Get the wanted collection,
	 * will be created if it doesn't exist yet
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {String}     name
	 * @param    {Function}   callback
	 */
	this.collection = function collection(name, callback) {

		if (this.cache[name]) {
			return callback(null, this.cache[name]);
		}

		this.queue.add(own.collection, arguments);
	};

	/**
	 * The function behind this.collection, run through a fuery queue
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Function} done      Function to tell fuery queue we're done
	 * @param    {String}   name      The name of the collection to get
	 * @param    {Function} callback  Actual callback to pass the collection to
	 */
	own.collection = function collection(done, name, callback) {

		var that = this;

		this.db.createCollection(name, function(err, collection) {

			// Tell the queue this function is done
			done();

			if (!err) {
				that.cache[name] = collection;
			}

			// Return the collection to the callback
			callback(err, collection);
		});
	};


});