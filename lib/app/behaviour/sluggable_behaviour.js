var slug  = alchemy.use('slug');

/**
 * The Sluggable Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       1.0.0
 */
var Sluggable = Function.inherits('Behaviour', function SluggableBehaviour(model, options) {

	var i;

	// The default options
	this.options = {
		target: 'slug',
		source: 'title'
	};

	Behaviour.call(this, model, options);

	this.source = Array.cast(this.options.source);

	// Get the source field
	for (i = 0; i < this.source.length; i++) {
		this.sourceField = model.blueprint.get(this.source[i]);

		if (this.sourceField) {
			break;
		}
	}

	// Get the target field
	this.targetField = model.blueprint.get(this.options.target);

	if (!this.targetField) {
		this.targetField = model.constructor.addField(this.options.target, 'String');
	}

	this.translatable = this.sourceField.translatable;
});

/**
 * The beforeSave
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Function}  next
 * @param    {Object}    record
 * @param    {Object}    options  Bhaviour options
 *
 * @return   {undefined}
 */
Sluggable.setMethod(function beforeSave(data, options, creating) {

	var that = this,
	    next,
	    old;

	// If the slug is already filled in when creating, skip generating
	// @todo: check for duplicates
	if (creating && data[that.targetField.name]) {
		return;
	}

	// If we're updating and the slug is already filled in, skip
	if (!creating && data[that.targetField.name]) {
		return;
	}

	next = this.wait('series');

	Function.series(function getExisting(next) {

		var oldOpts;

		if (creating) {
			return next();
		}

		oldOpts = {
			fields: [that.targetField.name],
			document: false
		};

		that.model.findById(data._id, oldOpts, function gotOld(err, result) {

			if (!err && result.length) {
				old = result[0][that.model.name][that.targetField.name];
			}

			next();
		});
	}, function createSlug(next) {

		// If not creating and an old one already exists, skip generation
		if (!creating && old) {
			return next();
		}

		that.createSlug(data, function createdSlug(err, result) {

			if (!Object.isEmpty(result)) {
				data[that.targetField.name] = result;
			}

			next();
		});
	}, next);
});

/**
 * Start the slug creating process
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Object}   record
 * @param    {Function} callback
 */
Sluggable.setMethod(function createSlug(record, callback) {

	var that   = this,
	    source,
	    tasks,
	    key,
	    i;

	if (Array.isArray(this.source)) {

		for (i = 0; i < this.source.length; i++) {
			source = record[this.source[i]];

			if (source) {
				break;
			}
		}
	}

	if (source && typeof source == 'object') {

		tasks = {};

		Object.each(source, function(title, key) {

			// Only generate a new slug if it doesn't exist yet
			if (!record[that.targetField.name] || !record[that.targetField.name][key]) {
				tasks[key] = function(next) {
					that.generateSlug(title, key, next);
				};
			}
		});

		return Function.parallel(tasks, callback);
	} else {
		// Only generate a new slug if it doesn't exist yet
		if (!record[that.targetField.name]) {
			return that.generateSlug(record[that.sourceField.name], callback);
		}
	}

	callback();
});

/**
 * Actually generate the slug from the given string,
 * and look for existing slugs in the path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {String}   title
 * @param    {String}   path
 * @param    {Function} callback
 */
Sluggable.setMethod(function generateSlug(title, key, callback) {

	var that = this,
	    baseSlug,
	    current,
	    model,
	    count,
	    items,
	    path;

	if (typeof key === 'function') {
		callback = key;
		key = false;
	}

	// If no valid title is given, do nothing!
	if (!title) {
		return callback();
	}

	baseSlug = slug(title).toLowerCase();
	current = baseSlug;
	model = Model.get(this.model.name);
	count = 1;

	path = this.targetField.name;

	if (key) {
		path += '.' + key;
	}

	Function.doWhile(function doWhile(next) {

		var conditions = {};
		conditions[path] = current;

		model.find('first', {conditions: conditions}, function(err, foundItems) {

			if (err != null) {
				return next(err);
			}

			items = foundItems;
			next();
		});
	}, function check() {

		// As long as items have been found we keep on adding numbers
		if (items.length) {

			count++;
			current = baseSlug + '-' + count;

			return true;
		}

	}, function finished(err) {
		callback(err, current);
	});
});