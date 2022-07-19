/**
 * The FieldSet class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {String}    name    The optional name of this fieldset
 * @param    {String}    model   The optional model this is about
 */
const FieldSet = Fn.inherits('Alchemy.Base', 'Alchemy.Criteria', function FieldSet(name, model) {

	this.name = name;

	if (typeof model == 'function') {
		model = model.name;
	}

	this.model = model;

	this.fields = new Deck();
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
 * @return   {Alchemy.Form.FieldSet}
 */
FieldSet.setStatic(function unDry(obj) {
	let set = new FieldSet(obj.name, obj.model);
	set.fields = obj.fields;
	return set;
});

/**
 * Create from array
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.1.4
 *
 * @param    {Array}   fields
 *
 * @return   {Alchemy.Form.FieldSet}
 */
FieldSet.setStatic(function fromArray(fields) {

	let set = new FieldSet();

	set.fields = fields;

	return set;
});

/**
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.5
 *
 * @type    {Deck}
 */
FieldSet.enforceProperty(function fields(new_value, old_value) {

	if (!new_value) {
		new_value = new Deck();
	} else if (!(new_value instanceof Deck)) {

		let fields = new_value,
		    field,
		    entry,
		    deck = new Deck();

		for (entry of fields) {

			if (typeof entry == 'string') {
				entry = {
					name : entry
				};
			}

			if (!entry.options) {
				entry.options = {};
			}

			if (entry.type) {
				entry.options.type = entry.type;
			}

			field = new Classes.Alchemy.Criteria.FieldConfig(entry.name, entry.options);
			deck.set(entry.name, field);
		}

		new_value = deck;
	}

	return new_value;
});

/**
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {Object}
 */
FieldSet.setMethod(function toDry() {
	return {
		value: {
			name      : this.name,
			model     : this.model,
			fields    : this.fields,
		}
	};
});

/**
 * Gat the JSON value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {Object}
 */
FieldSet.setMethod(function toJSON() {

	let result = {
		name    : this.name,
		model   : this.model,
		fields  : []
	};

	let field;

	for (field of this.fields) {
		result.fields.push(field.toJSON());
	}

	return result;
});

/**
 * Get an instance of the model
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 *
 * @return   {Model}
 */
FieldSet.setMethod(function getModel() {

	if (!this.model) {
		return;
	}

	if (!this._model) {
		this._model = alchemy.getModel(this.model);
	}

	return this._model;
});

/**
 * Iterator method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
FieldSet.setMethod(Symbol.iterator, function* iterate() {

	var fields = this.fields.getSorted(),
	    i;

	for (i = 0; i < fields.length; i++) {
		yield fields[i];
	}
});

/**
 * Add a field to this set
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.2
 *
 * @param    {String}   name      The name of the field to add
 * @param    {Object}   options
 *
 * @return   {Alchemy.Form.FieldConfig}
 */
FieldSet.setMethod(function addField(name, options) {

	let config = new Classes.Alchemy.Criteria.FieldConfig(name, options);

	if (this.model && !config.getContextModel()) {
		config.setContextModel(this.model);
	}

	this.fields.set(name, config);

	return config;
});

/**
 * Get a fieldconfig by its field name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @return   {Alchemy.Form.FieldConfig}
 */
FieldSet.setMethod(function get(name) {
	return this.fields.get(name);
});