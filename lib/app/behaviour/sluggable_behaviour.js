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

	if (!options.unique_modifier_fields) {
		options.unique_modifier_fields = [];
	} else if (!Array.isArray(options.unique_modifier_fields)) {
		options.unique_modifier_fields = Array.cast(options.unique_modifier_fields);
	}

	this.unique_modifier_fields = options.unique_modifier_fields;

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
 * @version  1.3.0
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

	if (schema.model_class) {
		main = schema.model_class;
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

		field_options = {
			description: 'A human-readable yet unique identifier'
		};

		// See if the target field we're adding needs to be translatable
		if (options.translatable || (options.translatable == null && source && source.is_translatable)) {
			field_options.translatable = true;
		}

		target = main.addField(options.target, 'String', field_options);
	} else if (target.is_translatable) {
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
 * @version  1.0.6
 *
 * @param    {Object}    data      The data that is to be saved
 * @param    {Object}    options   Behaviour options
 * @param    {Boolean}   creating  Is this record being created?
 */
Sluggable.setMethod(async function beforeSave(data, options, creating) {

	var that = this,
	    has_new_value,
	    old_record,
	    new_value,
	    old_value,
	    next;

	// Get the actual record data
	if (data[that.model.name]) {
		data = data[that.model.name];
	}

	// See if there is a new value defined
	new_value = data[that.target_field.name];

	if (typeof new_value == 'undefined') {
		has_new_value = false;
	} else {
		has_new_value = true;
	}

	// Let other event callbacks wait for this one
	next = this.wait('series');

	if (!creating) {
		old_record = await this.model.findById(data._id);

		if (old_value) {
			old_value = old_record[that.target_field.name];
		}
	}

	// If we're not creating a new document,
	// and the old document already has a slug,
	// and we're not explicitly setting a new slug value,
	// then do nothing
	if (!creating && old_value && !has_new_value) {
		return next();
	}

	let new_data = {};

	// Create a new data object, so the non-changed values are available
	if (old_record) {
		Object.assign(new_data, old_record.$main, data);
	} else {
		Object.assign(new_data, data);
	}

	// Try creating a new slug
	that.createSlug(new_data, new_value, function createdSlug(err, result) {

		if (err) {
			return next(err);
		}

		if (!Object.isEmpty(result)) {
			data[that.target_field.name] = result;
		}

		next();
	});
});

/**
 * Start the slug creating process
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.1.0
 *
 * @param    {Object}   record
 * @param    {String}   new_value
 * @param    {Function} callback
 */
Sluggable.setMethod(function createSlug(record, new_value, callback) {

	var that   = this,
	    source,
	    tasks,
	    key,
	    i;

	if (typeof new_value == 'function') {
		callback = new_value;
		new_value = undefined;
	}

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

		Object.each(source, function eachSource(source_title, key) {

			var has_value = !!record[that.target_field.name] && !!record[that.target_field.name][key];

			// If there already is a slug for this prefix,
			// and no new one was manually provided,
			// just return the old one
			if (has_value && (!new_value || !new_value[key])) {

				tasks[key] = function returnExistingValue(next) {
					next(null, record[that.target_field.name][key]);
				};

				return;
			}

			tasks[key] = function generateSlug(next) {

				if (new_value && new_value[key]) {
					source_title = new_value[key];
				}

				that.generateSlug(source_title, key, record, next);
			};
		});

		return Function.parallel(tasks, callback);
	} else {
		// Only generate a new slug if it doesn't exist yet
		if (!record[that.target_field.name]) {
			return that.generateSlug(record[that.source_field.name], false, record, callback);
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
 * @version  1.1.8
 *
 * @param    {String}   title
 * @param    {String}   path
 * @param    {Document} record
 * @param    {Function} callback
 */
Sluggable.setMethod(function generateSlug(title, key, record, callback) {

	var that = this,
	    for_record_id,
	    baseSlug,
	    current,
	    model,
	    count,
	    item,
	    path;

	if (typeof key == 'object') {
		callback = record;
		record = key;
		key = false;
	}

	if (typeof record == 'function') {
		callback = record;
		record = null;
	}

	if (record) {
		for_record_id = record._id;
	}

	if (typeof key === 'function') {
		callback = key;
		key = false;
	}

	// If no valid title is given, do nothing!
	if (!title) {
		return callback();
	}

	baseSlug = title.slug(that.replacement || '-').toLowerCase();
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

		if (that.unique_modifier_fields.length && record) {
			let value,
			    field,
			    i;

			for (i = 0; i < that.unique_modifier_fields.length; i++) {
				field = that.unique_modifier_fields[i];
				value = record[field];
				conditions[field] = value;
			}
		}

		model.find('first', {conditions: conditions}, function gotFirst(err, found_item) {

			if (err != null) {
				return next(err);
			}

			// Don't use the target record for duplicate checks
			if (found_item && for_record_id && String(for_record_id) == String(found_item._id)) {
				return next();
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