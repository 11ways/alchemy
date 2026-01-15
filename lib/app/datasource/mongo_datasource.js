const mongo = alchemy.use('mongodb'),
      MongoClient = mongo.MongoClient;

const CONNECTION = Symbol('connection'),
      CONNECTION_ERROR = Symbol('connection_error'),
      MONGO_CLIENT = Symbol('mongo_client');

/**
 * MongoDb Datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.16
 */
const Mongo = Function.inherits('Alchemy.Datasource.Nosql', function Mongo(name, _options) {

	var options,
	    uri;

	// Possible connection error
	this[CONNECTION_ERROR] = null;

	// The actual DB connection
	this[CONNECTION] = null;

	// The MongoDB Client instance
	this[MONGO_CLIENT] = null;

	// Define default options
	this.options = {
		host: '127.0.0.1',
		database: null,
		login: null,
		password: null,
		port: 27017
	};

	Mongo.super.call(this, name, _options);
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Mongo.setProperty('allowed_find_options', new Set([
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
]));

/**
 * Convert the given value to a BigInt
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {*}   value
 *
 * @return   {BigInt}
 */
Mongo.setMethod(function castToBigInt(value) {

	if (value == null) {
		return value;
	}

	if (typeof value == 'object') {
		if (value.toBigInt) {
			return value.toBigInt();
		}

		return null;
	}

	return BigInt(value);
});

/**
 * Convert the given value from a BigInt (for use in DB)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {BigInt}   value
 *
 * @return   {Mongo.Long}
 */
Mongo.setMethod(function convertBigIntForDatasource(value) {

	if (value == null) {
		return value;
	}

	return mongo.Long.fromBigInt(value);
});

/**
 * Convert the given value to a Decimal (for use in JS)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {*}   value
 *
 * @return   {BigInt}
 */
Mongo.setMethod(function castToDecimal(value) {

	if (value == null) {
		return value;
	}

	if (typeof value == 'object') {
		value = value.toString();
	}

	return new Blast.Classes.Develry.Decimal(value);
});

/**
 * Convert the given decimal for use in DB
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Decimal|string}   value
 *
 * @return   {Mongo.Decimal128}
 */
Mongo.setMethod(function convertDecimalForDatasource(value) {

	if (value == null) {
		return value;
	}

	if (!(value instanceof Blast.Classes.Develry.Decimal)) {
		value = new Blast.Classes.Develry.Decimal(value);
	}

	return mongo.Decimal128.fromString(value.toString());
});

/**
 * Get find options for the MongoDB server
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
		if (!this.allowed_find_options.has(key)) {
			continue;
		}

		result[key] = options[key];
	}

	return result;
});

/**
 * Get a connection to the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Pledge}
 */
Mongo.setMethod(function connect() {

	if (this[CONNECTION]) {
		return this[CONNECTION];
	}

	if (this[CONNECTION_ERROR]) {
		throw this[CONNECTION_ERROR];
	}

	let pledge = this[CONNECTION] = new Swift();

	// Create the connection to the database
	Pledge.done(MongoClient.connect(this.uri, this.mongoOptions), (err, client) => {

		this[CONNECTION] = null;

		if (err) {
			this[CONNECTION_ERROR] = err;
			alchemy.printLog(alchemy.SEVERE, 'Could not create connection to Mongo server', {err: err});
			return pledge.reject(err);
		} else {
			log.info('Created connection to Mongo datasource', this.name);
		}

		if (client) {
			this[MONGO_CLIENT] = client;
			this[CONNECTION] = client.db();
		}

		pledge.resolve(this[CONNECTION]);
	});

	return pledge;
});

/**
 * Get a mongodb collection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {string}     name
 *
 * @return   {Pledge<Collection>|Collection}
 */
Mongo.setMethod(function collection(name) {

	if (this.collections[name]) {
		return this.collections[name];
	}

	let result = Swift.waterfall(
		this.connect(),
		db => db.collection(name),
		collection => {
			this.collections[name] = collection;
			return collection;
		}
	);

	if (!this.collections[name]) {
		this.collections[name] = result;
	}

	return result;
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadDocumentFromDatasource}   context
 *
 * @return   {Pledge}
 */
Mongo.setMethod(function _read(context) {

	const that = this;

	const model = context.getModel(),
	      criteria = context.getCriteria();

	return Swift.waterfall(
		this.collection(model.table),
		async collection => {
	
			let compiled,
			    options,
			    pledge = new Swift();
	
			await criteria.normalize();
	
			compiled = await that.compileCriteria(criteria);
			options = that.compileCriteriaOptions(criteria);
	
			if (compiled.pipeline) {
	
				// Sorting should happen in the pipeline
				if (options.sort && options.sort.length) {
					let sort_object = {};
	
					for (let entry of options.sort) {
						sort_object[entry[0]] = entry[1];
					}
	
					compiled.pipeline.unshift({$sort: sort_object});
				}
	
				// Skipping also happens in the pipeline
				if (options.skip) {
					compiled.pipeline.push({$skip: options.skip});
				}
	
				let aggregate_options = {};
	
				Function.parallel({
					available: function getAvailable(next) {
	
						if (criteria.options.available === false) {
							return next(null, null);
						}
	
						let pipeline = JSON.clone(compiled.pipeline),
							cloned_options = JSON.clone(aggregate_options);
	
						pipeline.push({$count: 'available'});
	
						// Expensive aggregate just to get the available count...
						Pledge.done(collection.aggregate(pipeline, cloned_options), function gotAggregate(err, cursor) {
	
							if (err) {
								return next(err);
							}
	
							Pledge.done(cursor.toArray(), function gotAvailableArray(err, items) {
	
								if (err) {
									return next(err);
								}
	
								if (!items || !items.length) {
									return next(null, null);
								}
	
								let available = items[0].available;
	
								if (options.skip) {
									available += options.skip;
								}
	
								return next(null, available);
							});
						});
					},
					rows: function getRows(next) {
	
						let pipeline = JSON.clone(compiled.pipeline);
	
						// Limits also have to be set in the pipeline now
						// (We have to do it here, so the `available` count is correct)
						if (options.limit) {
							pipeline.push({$limit: options.limit});
						}
	
						Pledge.done(collection.aggregate(pipeline, aggregate_options), function gotAggregate(err, cursor) {
	
							if (err) {
								return next(err);
							}
	
							Pledge.done(cursor.toArray(), next);
						});
					}
				}, function done(err, data) {
	
					if (err) {
						return pledge.reject(err);
					}
	
					data.rows = that.organizeResultItems(model, data.rows);
	
					pledge.resolve(data);
				});
	
				return pledge;
			}
	
			// Create the cursor
			let cursor = collection.find(compiled, options);
	
			Function.parallel({
				available: function getAvailable(next) {
	
					if (criteria.options.available === false) {
						return next(null, null);
					}
	
					Pledge.done(collection.countDocuments(compiled), next);
				},
				rows: function getRows(next) {
					Pledge.done(cursor.toArray(), next);
				}
			}, function done(err, data) {

				if (err) {
					return pledge.reject(err);
				}

				data.rows = that.organizeResultItems(model, data.rows);

				pledge.resolve(data);
			});

			return pledge;
		}
	);
});

/**
 * Create a record in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveToDatasource}   context
 *
 * @return   {Pledge}
 */
Mongo.setMethod(function _create(context) {

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

			Pledge.done(collection.insertOne(data, {w: 1, fullResult: true}), function afterInsert(err, result) {

				// Clear the cache
				model.nukeCache();

				if (err != null) {
					return pledge.reject(err);
				}

				// @TODO: fix because of mongodb 6
				let write_errors = result.message?.documents?.[0]?.writeErrors;

				if (write_errors) {
					let violations = new Classes.Alchemy.Error.Validation.Violations();

					if (write_errors.length) {
						let entry;

						for (entry of write_errors) {
							let violation = new Classes.Alchemy.Error.Validation.Violation();
							violation.message = entry.errmsg || entry.message || entry.code;
							violations.add(violation);
						}
					} else {
						violations.add(new Error('Unknown database error'));
					}

					return pledge.reject(violations);
				}

				pledge.resolve(Object.assign({}, data));
			});

			return pledge;
		}
	);
});

/**
 * Update a record in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveToDatasource}   context
 *
 * @return   {Pledge}
 */
Mongo.setMethod(function _update(context) {

	const model = context.getModel();

	return Swift.waterfall(
		this.collection(model.table),
		collection => {
			return performUpdate(collection, model, context);
		}
	);
});

/**
 * Perform the update
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Pledge}
 */
const performUpdate = (collection, model, context) => {

	const options = context.getSaveOptions();

	let key;

	// Get the converted data
	const data = context.getConvertedData();

	// Get the id to update, it should always be inside the given data
	let id = data._id;

	// Clone the data object
	let doc = {...data};

	// Values that will get flattened
	let to_flatten = {};

	// Field names that won't get flattened
	let no_flatten = {};

	// Remove the id
	delete doc._id;

	if (!options.override_created) {
		delete doc.created;
	}

	// Iterate over the fields
	for (key in doc) {
		let field = model.getField(key);

		if (field && (field.is_self_contained || field.is_translatable || typeof doc[key] == 'object')) {
			no_flatten[key] = doc[key];
		} else {
			to_flatten[key] = doc[key];
		}
	}

	// Flatten the object, using periods & NOT flattening arrays
	let flat = Object.flatten(to_flatten, '.', false);

	// Assign the no-flatten values, too
	Object.assign(flat, no_flatten);

	let unset = {};

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

	let update_object = {
		$set: flat
	};

	if (!Object.isEmpty(unset)) {
		update_object.$unset = unset;
	}

	if (options.debug) {
		console.log('Updating with obj', id, update_object);
	}

	let promise;

	if (collection.findOneAndUpdate) {
		promise = collection.findOneAndUpdate({_id: id}, update_object, {upsert: true});
	} else if (collection.findAndModify) {
		promise = collection.findAndModify({_id: id}, [['_id', 1]], update_object, {upsert: true});
	} else {
		// If it's not available (like nedb)
		promise = collection.update({_id: ''+id}, update_object, {upsert: true});
	}

	let pledge = new Swift();

	Pledge.done(promise, function afterUpdate(err, result) {

		// Clear the cache
		model.nukeCache();

		if (err != null) {
			return pledge.reject(err);
		}

		pledge.resolve(Object.assign({}, data));
	});

	return pledge;

};

/**
 * Remove a record from the database
 *
 * @author   Kjell Keisse   <kjell@codedor.be>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.RemoveFromDatasource}   context
 *
 * @return   {Pledge}
 */
Mongo.setMethod(function _remove(context) {

	const model = context.getModel(),
	      query = context.getQuery();

	return Swift.waterfall(
		this.collection(model.table),
		collection => {

			let pledge = new Swift();

			Swift.done(collection.findOneAndDelete(query), function _deleted(err, result){

				//clear cache
				model.nukeCache();
	
				if (err != null) {
					return pledge.reject(err);
				}
	
				pledge.resolve(!!result);
			});

			return pledge;
		}
	);
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 */
Mongo.setMethod(function _ensureIndex(model, index, callback) {

	this.collection(model.table, async function gotCollection(err, collection) {

		if (err != null) {
			return callback(err);
		}

		let options = {
			name   : index.options.name,
			unique : index.options.unique ? true : false,
			sparse : index.options.sparse ? true : false,
		};

		let index_specs;

		// Hack in the text indexes
		if (options.name == 'text') {
			let key;

			index_specs = {};

			for (key in index.fields) {
				index_specs[key] = 'text';
			}
		} else {
			index_specs = index.fields;
		}

		try {
			await collection.createIndex(index_specs, options);
		} catch (err) {

			// Check for IndexOptionsConflict
			if (err.code === 85) {
				let index_to_drop;

				if (err.message.includes('already exists with a different name:')) {
					index_to_drop = err.message.after('different name:').trim();
				}

				if (!index_to_drop) {
					index_to_drop = options.name;
				}

				try {

					// Index already exists, drop it
					await collection.dropIndex(index_to_drop);

					// Try again
					await collection.createIndex(index_specs, options);
				} catch (second_err) {
					return callback(second_err);
				}
			} else {
				return callback(err);
			}
		}

		callback();
	});
});