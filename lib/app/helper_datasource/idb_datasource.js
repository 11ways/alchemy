/**
 * IndexedDb Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Idb = Function.inherits('Alchemy.Datasource.Nosql', function IndexedDb(name, options) {
	IndexedDb.super.call(this, name, options);
});

/**
 * Get a connection to the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Idb.decorateMethod(Blast.Decorators.memoize(), function collection(name) {

	var that = this,
	    pledge = new Pledge();

	let db = new Blast.Classes.IndexedDb(name);

	// See if the records store exists or not
	db.hasStore('records', function hasStore(err, has_store) {

		if (err) {
			return pledge.reject(err);
		}

		if (has_store) {
			db.emit('has_records_store');
			return pledge.resolve(db);
		}

		db.modifyObjectStore('records', function gotStore(err, store) {

			if (err) {
				return pledge.reject(err);
			}

			db.emit('has_records_store');
			pledge.resolve(db);
		});
	});

	return pledge;
});

/**
 * Create an item in the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Idb.setMethod(function _create(model, data, options, callback) {

	var that = this;

	this.collection(model.table).done(function gotCollection(err, collection) {

		if (err) {
			return callback(err);
		}

		collection.create('records', data, function saved(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, result[0]);
		});
	});
});

/**
 * Update an item in the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Idb.setMethod(function _update(model, data, options, callback) {

	var that = this;

	this.collection(model.table).done(function gotCollection(err, collection) {

		if (err) {
			return callback(err);
		}

		collection.put('records', data, function saved(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, result[0]);
		});
	});
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Idb.setMethod(function _read(model, criteria, callback) {

	var that = this;

	this.collection(model.table).done(async function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		let compiled,
		    options;

		await criteria.normalize();

		compiled = await that.compileCriteria(criteria);
		options = that.compileCriteriaOptions(criteria);

		collection.read('records', compiled, options, callback);
	});
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Idb.setMethod(function _ensureIndex(model, index, callback) {

	var that = this,
	    collection;

	return callback();

	return Function.series(function getCollection(next) {
		that.collection(model.table).done(next);
	}, function checkIndex(next, _c) {
		collection = _c;
		collection.hasIndex('records', index.options.name, next);
	}, function createIndex(next, has_index) {

		if (has_index) {
			return next();
		}

		collection.createIndex('records', index.options.name, index, next);
	}, function done(err, result) {

		console.log('DONE IDB INDEX:', err, result);

		if (err) {
			return;
		}

	});

});