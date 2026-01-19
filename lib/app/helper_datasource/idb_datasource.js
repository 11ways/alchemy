/**
 * IndexedDb Datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 */
const Idb = Function.inherits('Alchemy.Datasource.Nosql', 'IndexedDb');

/**
 * Get a connection to the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveToDatasource}   context
 *
 * @return   {Pledge}
 */
Idb.setMethod(function _create(context) {

	const model = context.getModel();

	return Swift.waterfall(
		this.collection(model.table),
		collection => {
			const converted_data = context.getConvertedData();

			const pledge = new Swift();

			let data = {};

			for (let key in converted_data) {
				let val = converted_data[key];

				if (val == null) {
					continue;
				}

				data[key] = val;
			}

			collection.create('records', data, function saved(err, result) {

				if (err) {
					return pledge.reject(err);
				}
	
				pledge.resolve(result[0]);
			});

			return pledge;
		}
	);
});

/**
 * Update an item in the datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveToDatasource}   context
 *
 * @return   {Pledge}
 */
Idb.setMethod(function _update(context) {

	const model = context.getModel();

	return Swift.waterfall(
		this.collection(model.table),
		collection => {
			let data = context.getConvertedData();
			return collection.put('records', data);
		},
		result => result[0]
	);
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 */
Idb.setMethod(function _read(context) {

	const model = context.getModel(),
	      criteria = context.getCriteria();

	let collection;

	return Swift.waterfall(
		this.collection(model.table),
		async _collection => {
			collection = _collection;
			return criteria.normalize();
		},
		() => this.compileCriteria(criteria),
		compiled => {
			let options = this.compileCriteriaOptions(criteria);
			return collection.read('records', compiled, options);
		},
		rows => {
			return {rows};
		}
	);
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

		if (err) {
			console.error('Failed to create IDB index:', err);
			return;
		}

	});

});