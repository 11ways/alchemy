var slug  = alchemy.use('slug');

/**
 * The Sluggable Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.1.0
 * @version       1.0.0
 */
var Sluggable = Function.inherits('Behaviour', function SluggableBehaviour(model, options) {

	// The default options
	this.options = {
		target: 'slug',
		source: 'title'
	};

	Behaviour.call(this, model, options);

	// Get the source field
	this.sourceField = model.blueprint.get(this.options.source);

	// Get the target field
	this.targetField = model.blueprint.get(this.options.target);

	this.translatable = this.sourceField.translatable;
});

/**
 * The beforeSave
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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

	var that = this;

	pr('Are we creating new data: ' + creating)
	console.log(options, creating)

	return;

	this.createSlug(record, function(err, result) {

		if (!Object.isEmpty(result)) {
			record[that.target] = result;
		}

		next();
	});
});

/**
 * Start the slug creating process
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	} else {
		source = record[this.source];
	}

	if (source && typeof source == 'object') {

		tasks = {};

		Object.each(source, function(title, key) {

			// Only generate a new slug if it doesn't exist yet
			if (!record[that.target] || !record[that.target][key]) {
				tasks[key] = function(next) {
					that.generateSlug(title, key, next);
				};
			}
		});

		Function.parallel(tasks, callback);
	} else {
		// Only generate a new slug if it doesn't exist yet
		if (!record[that.target]) {
			that.generateSlug(source, callback);
		}
	}
});

/**
 * Actually generate the slug from the given string,
 * and look for existing slugs in the path
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	model = Model.get(this.modelName);
	count = 1;

	path = this.target;

	if (key) {
		path += '.' + key;
	}

	Function.doWhile(function doWhile(next) {

		var conditions = {};
		conditions[path] = current;

		model.find('first', {conditions: conditions}, function(err, foundItems) {
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