/**
 * Fallback Datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const CONNECT_PLEDGE = Symbol('connect_pledge');

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
Fallback.setMethod(function connect() {

	if (this[CONNECT_PLEDGE]) {
		return this[CONNECT_PLEDGE];
	}

	var that = this;

	// The "upper" or "local" datasource
	this.upper = Datasource.get(this.options.upper);

	// The "lower" or "remote" datasource
	this.lower = Datasource.get(this.options.lower);

	let result = Function.parallel(function doUpper(next) {
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

	this[CONNECT_PLEDGE] = result;

	// A rejected setup must not stay cached (this used to be a plain
	// memoize): one failed upper setup at startup would keep the whole
	// datasource broken for the process lifetime, with no retry
	result.done(err => {
		if (err && this[CONNECT_PLEDGE] === result) {
			this[CONNECT_PLEDGE] = null;
		}
	});

	return result;
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

	// A copy: `extraneous` gets set below, and leaking that into the
	// caller's (possibly reused) save-options object would loosen schema
	// strictness of unrelated saves
	options = Object.assign({}, options);

	let context;

	return Function.series(function convertToDatasource(next) {

		context = new Classes.Alchemy.OperationalContext.SaveDocumentToDatasource();
		context.setDatasource(upper);
		context.setModel(model);
		context.setRootData(data);
		context.setConvertedData(data);
		context.setSaveOptions(options);

		Pledge.Swift.done(upper.toDatasource(context), next);
	}, function addTempValues(next, result) {
		data = result;

		// Add time it was cached
		data._$cache_time = Date.now();

		// Also mark it as being a local save if needed
		let time;

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

		// Store the *converted* data (with the temp values added above), not the
		// original app-side record. Without this the upper datasource caches the
		// raw working values: e.g. a class-typed field is structured-cloned by
		// IndexedDB into a plain, prototype-less object that can't be revived on
		// read. The normal create()/update() flow does this same setConvertedData.
		context.setConvertedData(data);

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
			throw err;
		}

		return result.last();
	});
});

/**
 * Query the databases
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.5
 *
 * @param    {Alchemy.OperationalContext.ReadDocumentFromDatasource}   context
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function read(context) {

	let criteria = context.getCriteria(),
	    only_remote = criteria.options.only_remote,
	    tasks = [];

	if (!criteria.options.only_local) {
		let lower_criteria = criteria.clone();
		lower_criteria.datasource = this.lower;

		let lower_context = context.createChild();
		lower_context.setCriteria(lower_criteria);

		// A rejected lower (remote) read must not reject the whole query:
		// resolve to null instead, so the waterfall falls through to the upper
		// (local cache) read. Without this, being offline made every find fail
		// even though the cache had the data.
		// The exception is an `only_remote` read (used to compare against the
		// authoritative version, e.g. for sync-conflict checks): answering that
		// from the cache would defeat its purpose, so the failure surfaces.
		tasks.push(() => {
			let attempt = new Swift();

			Swift.done(this.lower.read(lower_context), (err, result) => {

				if (err) {

					if (only_remote) {
						return attempt.reject(err);
					}

					if (Blast.isBrowser && typeof alchemy != 'undefined' && alchemy.distinctProblem) {
						alchemy.distinctProblem('fallback-lower-read', 'Remote read failed, using local cache', {repeat_after: 60000});
					}

					return attempt.resolve(null);
				}

				attempt.resolve(result);
			});

			return attempt;
		});
	}

	if (!only_remote) {
		let upper_criteria = criteria.clone();
		upper_criteria.datasource = this.upper;

		let upper_context = context.createChild();
		upper_context.setCriteria(upper_criteria);

		tasks.push(lower_result => lower_result || this.upper.read(upper_context));
	}

	if (!tasks.length) {
		// only_local + only_remote is contradictory - reject clearly instead
		// of letting an empty waterfall blow the stack
		return Swift.reject(new Error('Cannot combine the only_local and only_remote options'));
	}

	return Swift.waterfall(...tasks);
});

/**
 * Get data that needs to be synced
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.5
 *
 * @param    {Model}   model
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function getRecordsToSync(model) {

	var that = this,
	    criteria = model.find();

	criteria.where('_$needs_remote_save').equals(1);

	let context = new Classes.Alchemy.OperationalContext.ReadDocumentFromDatasource();
	context.setDatasource(this.upper);
	context.setModel(model);
	context.setCriteria(criteria);

	// Datasource#read resolves with `{items, available}` since 1.4.2, but the
	// consumers of this method (getRecordsToBeSavedRemotely) iterate the result
	// directly - so unwrap to the items array, or offline saves never sync.
	return Swift.waterfall(
		this.upper.read(context),
		result => (result && result.items) ? result.items : (result || [])
	);
});

/**
 * Get the raw cached (upper) row for a record, WITH its `_$` bookkeeping
 * fields - reviving the record through toApp strips those, so this is the
 * only way to see whether a cached row still has a pending local save.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.7
 * @version  1.4.7
 *
 * @param    {Model}             model
 * @param    {ObjectId|string}   id
 *
 * @return   {Pledge<Object|null>}
 */
Fallback.setMethod(function getUpperVersion(model, id) {

	// Cached rows were written with THIS datasource's conversions (e.g. ids
	// as strings), so the id condition must be cast the same way: as a plain
	// string, not whatever the upper datasource would natively use.
	let criteria = model.find();
	criteria.where('_id').equals(String(id));
	criteria.datasource = this.upper;

	let context = new Classes.Alchemy.OperationalContext.ReadDocumentFromDatasource();
	context.setDatasource(this.upper);
	context.setModel(model);
	context.setCriteria(criteria);

	return Swift.waterfall(
		this.upper.read(context),
		result => {

			let items = (result && result.items) ? result.items : (result || []);
			let row = items[0] || null;

			// Reads wrap each record under its model name
			if (row && row[model.name]) {
				row = row[model.name];
			}

			return row;
		}
	);
});

/**
 * Overwrite the locally cached version of a record with the (newer) remote
 * version, clearing its needs-remote-save flag: the queued local edit is
 * discarded in favor of what the server has.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.7
 * @version  1.4.7
 *
 * @param    {Model}    model
 * @param    {Object}   remote_data   The remote record in app format
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function adoptRemoteVersion(model, remote_data) {
	return this.storeInUpperDatasource(model, remote_data, {
		create      : false,
		remote_save : true,
	});
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

			// A VALIDATION rejection is not "offline": the save is doomed,
			// and resolving successfully (while leaving the record queued
			// for endless replay) hid the error from the caller entirely
			if (result.lower.err instanceof Classes.Alchemy.Error.Validation) {
				return next(result.lower.err);
			}

			return next();
		}

		let upper_options = Object.assign({}, options);

		// This second storeInUpperDatasource is ALWAYS an update
		upper_options.create = false;
		upper_options.local_save = false;
		upper_options.remote_save = true;

		// Cache what the remote actually SAVED, not what the client sent:
		// the server bumps `updated` (and hooks may mutate fields), so
		// caching the request payload left the offline copy with a stale
		// `updated` that broke every freshness comparison afterwards
		let store_data = result.lower.result;

		if (store_data && store_data.$main) {
			store_data = store_data.$main;
		}

		if (!store_data) {
			store_data = data;
		}

		that.storeInUpperDatasource(model, store_data, upper_options).done(function adjustedUpper(err, result) {
			next(null, {err: err, result: result});
		});
	}, function doToApp(next) {

		if (saved_data.lower.result) {
			next(null, saved_data.lower.result);
			// Lower data can already be a Document instance!
			// @TODO: add a check for that?
			//lower.toApp(model, null, options, saved_data.lower.result, next);
		} else if (saved_data.upper.result) {
			// storeInUpperDatasource already returns app-format data (its
			// last step runs upper.toApp), so converting it AGAIN would
			// corrupt any field whose app and datasource formats differ.
			// This is the normal path for offline saves.
			next(null, saved_data.upper.result);
		} else {
			// Both saves failed: surface the actual save error instead of
			// letting a toApp call on `undefined` throw a misleading
			// "Unable to convert data: no data given"
			next(saved_data.upper.err || saved_data.lower.err || new Error('Both datasource saves failed'));
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
 * Remove data: the lower (authoritative) datasource first, then the cached
 * upper copy - a Fallback datasource used to inherit the base `_remove`,
 * which rejects unconditionally, so its models could never delete anything.
 * Deletes still need the lower to be reachable (there is no offline
 * tombstone queue); the upper purge is best-effort.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.7
 * @version  1.4.7
 *
 * @param    {Alchemy.OperationalContext.RemoveFromDatasource}   context
 *
 * @return   {Pledge}
 */
Fallback.setMethod(function _remove(context) {

	let that = this;

	let lower_context = context.createChild();
	lower_context.setDatasource(this.lower);

	return Swift.waterfall(
		this.lower.remove(lower_context),
		result => {

			let upper_context = context.createChild();
			upper_context.setDatasource(that.upper);

			let attempt = new Swift();

			// Not every upper implements removes: a leftover cached copy is
			// preferable to failing a delete the lower already accepted
			Swift.done(that.upper.remove(upper_context), () => attempt.resolve(result));

			return attempt;
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