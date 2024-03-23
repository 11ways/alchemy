/**
 * Fallback Datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Fallback = Function.inherits('Alchemy.Datasource', function Fallback(name, options) {
	// Call the parent constructor
	Fallback.super.call(this, name, options);
});

/**
 * Indicate this is part of the cache
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Fallback.setProperty('has_offline_cache', true);

/**
 * Create a connection to the 2 databases
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Fallback.decorateMethod(Blast.Decorators.memoize({ignore_arguments: true}), function connect() {

	var that = this,
	    tasks = [];

	// The "upper" or "local" datasource
	this.upper = Datasource.get(this.options.upper);

	// The "lower" or "remote" datasource
	this.lower = Datasource.get(this.options.lower);

	return Function.parallel(function doUpper(next) {
		// The upper datasource is needed
		that.upper.setup().done(next);
	}, function doLower(next) {
		// The lower one isn't necesarily needed
		that.lower.setup().done(function whenDone(err) {

			if (err) {
				console.warn('Failed to setup lower datasource', that.lower.name, err);
			}

			next();
		});
	}, null);

	return Function.parallel(tasks);
});

/**
 * Store the data in the local cache
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Model}   model
 * @param    {Object}  data
 * @param    {Object}  options
 */
Fallback.setMethod(function storeInUpperDatasource(model, data, options) {

	var that = this,
	    upper = that.upper;

	if (!options) {
		options = {};
	}

	return Function.series(function convertToDatasource(next) {

		let context = new Classes.Alchemy.OperationalContext.SaveDocumentToDatasource();
		context.setDatasource(upper);
		context.setModel(model);
		context.setRootData(data);
		context.setSaveOptions(options);

		Pledge.Swift.done(upper.toDatasource(context), next);
	}, function addTempValues(next, result) {
		data = result;

		// Add time it was cached
		data._$cache_time = Date.now();

		// Also mark it as being a local save if needed
		if (options.local_save) {
			if (options.local_save === true) {
				time = Date.now();
			} else {
				time = options.local_save;
			}

			data._$local_save_time = time;

			// IndexedDB does not use indexes on booleans, so use a number!
			data._$needs_remote_save = 1;
		}

		// And mark is as having saved, too
		if (options.remote_save) {
			if (options.remote_save === true) {
				time = Date.now();
			} else {
				time = options.remote_save;
			}

			data._$remote_save_time = time;
			data._$needs_remote_save = undefined;
		}

		// @TODO: we're not actually setting the "updated" part here...
		// (when doing a local save)
		if (Blast.isBrowser && window.sessionStorage && data.updated) {
			window.sessionStorage[data._id] = Number(data.updated);
		}

		// Allow extraneous values (the ones we just added in this function)
		options.extraneous = true;

		let promise;

		if (options.create === false) {
			promise = upper._update(context);
		} else {
			promise = upper._create(context);
		}

		Swift.done(promise, next);

	}, function gotUpdateResult(next, result) {
		let toapp_context = context.withDatasourceEntry(result);
		Pledge.Swift.done(upper.toApp(toapp_context), next);
	}, function done(err, result) {

		if (err) {
			return;
		}

		return result.last();
	});
});

/**
 * Query the databases
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadDocumentFromDatasource}   context
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function read(context) {

	let criteria = context.getCriteria(),
	    tasks = [];

	if (!criteria.options.only_local) {
		let lower_criteria = criteria.clone();
		lower_criteria.datasource = this.lower;

		let lower_context = context.createChild();
		lower_context.setCriteria(lower_criteria);

		tasks.push(() => this.lower.read(context));
	}

	let upper_criteria = criteria.clone();
	upper_criteria.datasource = this.upper;

	let upper_context = context.createChild();
	upper_context.setCriteria(upper_criteria);

	tasks.push(lower_result => lower_result || this.upper.read(upper_context));

	return Swift.waterfall(...tasks);
});

/**
 * Get data that needs to be synced
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Model}   model
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function getRecordsToSync(model) {

	var that = this,
	    pledge = new Pledge,
	    criteria = model.find();

	criteria.where('_$needs_remote_save').equals(1);

	this.upper.read(model, criteria, function gotRecords(err, records) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(records);
	});

	return pledge;
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadDocumentFromDatasource}   context
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function create(context) {
	return this.createOrUpdate('create', context);
});

/**
 * Update new data into the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadDocumentFromDatasource}   context
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function update(context) {
	return this.createOrUpdate('update', context);
});

/**
 * Insert new data into the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadDocumentFromDatasource}   context
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function createOrUpdate(method, context) {

	let model = context.getModel(),
	    data = context.getRootData(),
	    options = context.getSaveOptions();

	let that = this,
	    upper = this.upper,
	    lower = this.lower,
	    pledge,
	    saved_data;

	pledge = Function.series(function initialSave(next) {

		var tasks = {
			lower : function doLowerCreate(next) {

				Swift.done(
					lower[method](context),
					(err, result) => {
						next(null, {err: err, result: result});
					}
				);
			},
			upper : function doUpperCreate(next) {

				var upper_options = Object.assign({}, options);

				if (method == 'create') {
					upper_options.create = true;
				} else {
					upper_options.create = false;
				}

				upper_options.local_save = true;
				upper_options.remote_save = false;

				that.storeInUpperDatasource(model, data, upper_options).done(function createdUpper(err, result) {
					next(null, {err: err, result: result});
				});
			}
		};

		Function.parallel(tasks, next);
	}, function updateLocal(next, result) {

		saved_data = result;

		// Did we have some kind of error in the lower db?
		// Then we should leave the 'needs_remote_save' fields as is in the upper one
		if (result.lower.err) {
			return next();
		}

		let upper_options = Object.assign({}, options);

		// This second storeInUpperDatasource is ALWAYS an update
		upper_options.create = false;
		upper_options.local_save = false;
		upper_options.remote_save = true;

		that.storeInUpperDatasource(model, data, upper_options).done(function adjustedUpper(err, result) {
			next(null, {err: err, result: result});
		});
	}, function doToApp(next) {

		if (saved_data.lower.result) {
			next(null, saved_data.lower.result);
			// Lower data can already be a Document instance!
			// @TODO: add a check for that?
			//lower.toApp(model, null, options, saved_data.lower.result, next);
		} else {
			let toapp_context = context.withDatasourceEntry(saved_data.upper.result);
			Swift.done(upper.toApp(toapp_context), next);
		}

	}, function done(err, result) {

		if (err) {
			return;
		}

		result = result.last();

		return result;
	});

	return pledge;
});

/**
 * Ensure an index in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Fallback.setMethod(function _ensureIndex(model, index, callback) {

	var that = this,
	    pledge;

	pledge = Function.parallel(function doLowerCreate(next) {
		that.lower._ensureIndex(model, index, function ensuredLowerIndex(err, result) {
			next(null, {err: err, result: result});
		});
	}, function doUpperCreate(next) {
		that.upper._ensureIndex(model, index, function ensuredUpperIndex(err, result) {
			next(null, {err: err, result: result});
		});
	}, function done(err, result) {
		return null;
	});

	pledge.done(callback);

	return pledge;
});