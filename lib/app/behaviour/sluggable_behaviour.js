var slug = alchemy.use('mollusc');

/**
 * The Sluggable Behaviour class
 *
 * @constructor
 * @extends       Alchemy.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       0.3.0
 */
var Sluggable = Function.inherits('Alchemy.Behaviour', function SluggableBehaviour(model, options) {

	Behaviour.call(this, model, options);

	// Source options
	this.source = options.source;

	this.source_field = options.source_field;
	this.target_field = options.target_field;
	this.replacement = options.replacement;

	this.translatable = this.source_field.translatable;
});

/**
 * Default slug options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.3
 *
 * @type     {Object}
 */
Sluggable.setProperty('default_options', {
	translatable : null,
	target       : 'slug',
	source       : ['title', 'name'],
	replacement  : '-'
});

/**
 * Get the source field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}    source
 * @param    {Schema}    schema
 */
Sluggable.setStatic(function getSource(source, schema) {

	var field,
	    i;

	source = Array.cast(source);

	for (i = 0; i < source.length; i++) {
		field = schema.get(source[i]);

		if (field) {
			break;
		}
	}

	return field;
});

/**
 * Listen to attachments to schema's
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Schema}    schema
 * @param    {Object}    options
 */
Sluggable.setStatic(function attached(schema, new_options) {

	var field_options,
	    options,
	    source,
	    target,
	    main;

	if (schema.modelClass) {
		main = schema.modelClass;
	} else {
		main = schema;
	}

	// Merge the options object
	options = Object.assign({}, this.prototype.default_options, new_options);

	// Add them back into the new_options by reference
	options = Object.assign(new_options, options);

	// Get the source field
	source = this.getSource(options.source, schema);

	// Get the target field
	target = schema.get(options.target);

	// Create the target if it doesn't exist yet
	if (!target) {

		field_options = {};

		// See if the target field we're adding needs to be translatable
		if (options.translatable || (options.translatable == null && source && source.isTranslatable)) {
			field_options.translatable = true;
		}

		target = main.addField(options.target, 'String', field_options);
	} else if (target.isTranslatable) {
		options.translatable = true;
	}

	// Also store the fields in the options
	options.source_field = source;
	options.target_field = target;
});

/**
 * The beforeSave
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.3
 *
 * @param    {Function}  next
 * @param    {Object}    record
 * @param    {Object}    options  Bhaviour options
 *
 * @return   {undefined}
 */
Sluggable.setMethod(function beforeSave(data, options, creating) {

	var that = this,
	    old_record,
	    next,
	    old;

	// @TODO: what if it's saved as associated data?
	// Then this will fail, probably
	if (data[that.model.name]) {
		data = data[that.model.name];
	}

	// If the slug is already filled in when creating, skip generating
	// @todo: check for duplicates
	if (creating && data[that.target_field.name]) {
		return;
	}

	// If we're updating and the slug is already filled in, skip
	if (!creating && data[that.target_field.name]) {
		return;
	}

	next = this.wait('series');

	Function.series(function getExisting(next) {

		var oldOpts;

		// Don't attempt to check the existing DB value
		// if we're creating a new entry
		if (creating) {
			return next();
		}

		oldOpts = {
			fields: [].concat(that.source_field.name, that.target_field.name),
			document: false
		};

		that.model.findById(data._id, oldOpts, function gotOld(err, result) {

			if (!err && result.length) {
				old_record = result[0][that.model.name];
				old = old_record[that.target_field.name];
			}

			next();
		});
	}, function createSlug(next) {

		// If not creating and an old one already exists, skip generation
		if (!creating && old) {
			return next();
		}

		that.createSlug(Object.assign({}, old_record, data), function createdSlug(err, result) {

			if (!Object.isEmpty(result)) {
				data[that.target_field.name] = result;
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
 * @version  0.2.0
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
	} else {
		source = record[this.source];
	}

	if (source && typeof source == 'object') {

		tasks = {};

		Object.each(source, function eachSource(title, key) {

			// Only generate a new slug if it doesn't exist yet
			if (!record[that.target_field.name] || !record[that.target_field.name][key]) {
				tasks[key] = function generateSlug(next) {
					that.generateSlug(title, key, next);
				};
			}
		});

		return Function.parallel(tasks, callback);
	} else {
		// Only generate a new slug if it doesn't exist yet
		if (!record[that.target_field.name]) {
			return that.generateSlug(record[that.source_field.name], callback);
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
 * @version  0.2.0
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
	    item,
	    path;

	if (typeof key === 'function') {
		callback = key;
		key = false;
	}

	// If no valid title is given, do nothing!
	if (!title) {
		return callback();
	}

	baseSlug = slug(title, {replacement: that.replacement || '-'}).toLowerCase();
	current = baseSlug;
	model = Model.get(this.model.name);
	count = 1;

	path = this.target_field.name;

	if (key) {
		path += '.' + key;
	}

	Function.doWhile(function doWhile(next) {

		var conditions = {};
		conditions[path] = current;

		model.find('first', {conditions: conditions}, function gotFirst(err, found_item) {

			if (err != null) {
				return next(err);
			}

			item = found_item;
			next();
		});
	}, function check() {

		// As long as items have been found we keep on adding numbers
		if (item) {

			count++;
			current = baseSlug + (that.replacement || '-') + count;

			return true;
		}

	}, function finished(err) {
		callback(err, current);
	});
});