/**
 * The Schema class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var Schema = Deck.extend(function Schema() {

	Deck.call(this);

	this.associations = {};

});

/**
 * Add a field to this schema
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {String}   type
 * @param    {Object}   options
 */
Schema.setMethod(function addField(name, type, options) {

	var FieldClass,
	    className,
	    field;

	className = type + 'FieldType';

	if (!alchemy.classes[className]) {
		className = 'FieldType';
	}

	field = new alchemy.classes[className](name, options);

	this.set(name, field);
});

/**
 * Get a field
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 *
 * @return   {FieldType}
 */
Schema.setMethod(function getField(name) {
	return this.get(name);
});

/**
 * Conform association arguments
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   _alias
 * @param    {String}   _modelname
 * @param    {Object}   _options
 */
Schema.setMethod(function getAssociationArguments(_alias, _modelname, _options) {

	var modelName = _modelname,
	    options = _options,
	    alias = _alias;

	if (Object.isObject(modelName)) {
		options = modelName;
		modelName = undefined;
	} else if (!Object.isObject(options)) {
		options = {};
	}

	if (typeof modelName === 'undefined') {
		modelName = alias;
	}

	if (!options.foreignKey) {
		options.foreignKey = alias.foreign_key();
	}

	return {alias: alias, modelName: modelName, options: options}
});

/**
 * Add a belongsTo association
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   _alias
 * @param    {String}   _modelname
 * @param    {Object}   _options
 */
Schema.setMethod(function belongsTo(alias, modelName, options) {

	var fieldName,
	    args;

	args = this.getAssociationArguments(alias, modelName, options);

	alias = args.alias;
	modelName = args.modelName;
	options = args.options;

	this.addField(options.foreignKey, 'BelongsTo', args);

	this.associations[alias] = args;
});

/**
 * Process the given object
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Schema.setMethod(function process(data) {

	var fields,
	    result,
	    field,
	    i;

	fields = this.getSorted(false);
	result = {};

	for (i = 0; i < fields.length; i++) {
		field = fields[i];

		if (Object.hasProperty(data, field.name)) {
			result[field.name] = field.getValue(data[field.name]);
		} else if (field.hasDefault) {
			result[field.name] = field.getDefault();
		}
	}

	return result;
});