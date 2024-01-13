/**
 * Alchemy.Criteria.FieldConfig:
 * Configuration on what to do with a certain field during a database query
 * or anywhere data is represented
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.0
 * 
 * @param    {string}   path
 * @param    {Object}   options
 */
const FieldConfig = Fn.inherits('Alchemy.Base', 'Alchemy.Criteria', function FieldConfig(path, options) {

	// The name of the field
	this.name = null;

	// The full path to the value
	this.path = null;

	// The local path to the value (subfields)
	this.local_path = null;

	// The pieces of the path
	this.pieces = null;

	// The association this belongs to
	this.association = null;

	// The main model this field is in
	this.model = null;

	this.options = options || {};

	if (path) {
		this.parsePath(path);
	}
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.3
 *
 * @param    {Object}   obj
 *
 * @return   {Alchemy.Form.FieldConfig}
 */
FieldConfig.setStatic(function unDry(obj) {
	let result = new FieldConfig(obj.path, obj.options);

	if (obj.association) {
		result.association = obj.association;
	}

	if (obj.model) {
		result.model = obj.model;
	}

	return result;
});

/**
 * Get the title of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @type     {string}
 */
FieldConfig.setProperty(function title() {

	let title = this.options.title;

	if (!title) {
		title = this.name.titleize();
	}

	return title;
});

/**
 * Set the main model context this field is used for
 * (Actual field can be in an association of this model)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 *
 * @param    {string|Model}   model
 */
FieldConfig.setMethod(function setContextModel(model) {

	if (typeof model == 'string') {
		this.model = model;
		this._model = alchemy.getModel(model);
	} else {
		this._model = model;
		this.model = model.model_name;
	}
});

/**
 * Get the context model this field is used for
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
FieldConfig.setMethod(function getContextModel() {

	if (this._model) {
		return this._model;
	}

	if (!this.model) {
		return;
	}

	this._model = alchemy.getModel(this.model);
	return this._model;
});

/**
 * Get the actual model this field is in
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.5
 */
FieldConfig.setMethod(function getModel() {

	let model = this.getContextModel();

	if (!model) {
		return;
	}

	if (this.association) {
		try {
			let config = model.getAssociation(this.association);

			if (config) {
				model = alchemy.getModel(config.modelName);
			} else {
				model = null;
			}
		} catch (ignored_error) {}
	}

	return model;
});

/**
 * Get the field definition
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.7
 *
 * @return   {Field}
 */
FieldConfig.setMethod(function getFieldDefinition() {

	let model = this.getModel(),
	    result;

	if (model) {
		result = model.getField(this.local_path);
	}

	if (!result && this.options?.type) {
		let constructor = Classes.Alchemy.Field.Field.getMember(this.options.type);

		if (constructor) {
			result = new constructor(null, this.name, this.options);
		}
	}

	return result;
});

/**
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.0
 *
 * @return   {Object}
 */
FieldConfig.setMethod(function toJSON() {
	return {
		name        : this.name,
		path        : this.path,
		local_path  : this.local_path,
		association : this.association,
		options     : this.options,
		model       : this.model,
	};
});

/**
 * Parse a path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.0
 *
 * @param    {string}   path
 */
FieldConfig.setMethod(function parsePath(path) {

	let pieces;

	if (Array.isArray(path)) {
		pieces = path;
	} else if (path.indexOf('.') == -1) {
		this.name = path;
		this.path = path;
		this.local_path = path;
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
	this.local_path = '';

	for (i = 0; i < pieces.length; i++) {
		piece = pieces[i];

		if (piece[0].isUpperCase()) {

			if (this.association) {
				this.association += '.';
			} else {
				this.association = '';
			}

			this.association += piece;
			continue;
		} else {
			if (this.local_path) {
				this.local_path += '.';
			}

			this.local_path += piece;
		}
	}

	// The last piece is the name of the field
	this.name = piece;
});

/**
 * Look for a value in the given object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

/**
 * Get the display value for the value in the given object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.7
 * @version  1.1.7
 *
 * @param    {Object}   data
 *
 * @return   {string}
 */
FieldConfig.setMethod(function getDisplayValueIn(data) {

	let value = this.getValueIn(data);

	if (value == null) {
		return '';
	}

	if (typeof value == 'object') {
		if (Date.isDate(value)) {
			value = value.format('y-m-d H:i:s');
		}

		return value;
	}

	return '' + value;
});