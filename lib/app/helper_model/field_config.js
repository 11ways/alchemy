/**
 * The FieldConfig class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.4
 * 
 * @param    {String}   path
 * @param    {Object}   options
 */
const FieldConfig = Fn.inherits('Alchemy.Base', 'Alchemy.Criteria', function FieldConfig(path, options) {

	// The name of the field
	this.name = null;

	// The full path to the value
	this.path = null;

	// The pieces of the path
	this.pieces = null;

	// The association this belongs to
	this.association = null;

	this.options = options || {};

	if (path) {
		this.parsePath(path);
	}
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Object}   obj
 *
 * @return   {Alchemy.Form.FieldConfig}
 */
FieldConfig.setStatic(function unDry(obj) {
	let set = new FieldConfig(obj.path, obj.options);
	return set;
});

/**
 * Get the title of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @type     {String}
 */
FieldConfig.setProperty(function title() {

	let title = this.options.title;

	if (!title) {
		title = this.name.titleize();
	}

	return title;
});

/**
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.4
 *
 * @return   {Object}
 */
FieldConfig.setMethod(function toDry() {
	return {
		value: this.toJSON(),
	};
});

/**
 * Get the JSON value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.4
 *
 * @return   {Object}
 */
FieldConfig.setMethod(function toJSON() {
	return {
		name        : this.name,
		path        : this.path,
		association : this.association,
		options     : this.options,
	};
});

/**
 * Parse a path
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {String}   path
 */
FieldConfig.setMethod(function parsePath(path) {

	let pieces;

	if (Array.isArray(path)) {
		pieces = path;
	} else if (path.indexOf('.') == -1) {
		this.name = path;
		this.path = path;
		this.pieces = [path];
		return;
	} else {
		pieces = path.split('.');
	}

	let piece,
	    alias,
	    i;

	this.path = path;
	this.pieces = pieces;

	for (i = 0; i < pieces.length; i++) {
		piece = pieces[i];

		if (i == 0 && piece[0].isUpperCase()) {
			this.association = piece;
			continue;
		}
	}

	// The last piece is the name of the field
	this.name = piece;
});

/**
 * Look for a value in the given object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.1.4
 *
 * @param    {Object}   data
 */
FieldConfig.setMethod(function getValueIn(data) {

	if (!data) {
		return;
	}

	return Object.path(data, this.path);
});