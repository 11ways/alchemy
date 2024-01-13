const PathDefinition = Classes.Alchemy.PathDefinition;

/**
 * Path param definition
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.7
 */
const PathParamDefinition = Function.inherits('Alchemy.Base', function PathParamDefinition(config) {

	// The delimiter, probably "/"
	this.delimiter = config.delimiter;

	// The name of this parameter
	this.name = config.name;

	// Is this parameter optional?
	this.optional = config.optional || false;

	this.partial = config.partial;
	this.pattern = config.pattern;
	this.prefix = config.prefix;
	this.repeat = config.repeat;

	// Set the raw type definition
	this.typedef = config.typedef;

	// Does this have a type definition?
	this.has_type_definition = !!this.typedef;

	// Does this use a simple typedefinition?
	this.uses_simple_typedef = false;

	// The optional type class name
	this.type_class_name = null;

	// The optional field inside the class
	this.type_field_name = null;

	// The optional type class constructor
	this.type_class_constructor = null;

	// Is this a model type?
	this.is_model_type = false;

	// Has all the config been parsed?
	this.is_parsed = false;
});

/**
 * Create path param definitions
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Array|Object}
 */
PathParamDefinition.setStatic(function from(input) {

	if (!input) {
		return;
	}

	if (Array.isArray(input)) {
		let result = [],
		    entry,
		    temp;

		for (entry of input) {
			temp = PathParamDefinition.from(entry);

			if (temp) {
				result.push(temp);
			}
		}
	
		return result;
	}

	return new this(input);
});

/**
 * Get the model constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.7
 * @version  1.3.7
 */
PathParamDefinition.enforceProperty(function model_constructor(new_value) {

	if (!this.is_parsed) {
		this.parseTypeDefinition();
	}

	if (!new_value) {
		const constructor = this.type_class_constructor;

		if (constructor && this.is_model_type) {
			new_value = constructor;
		}
	}

	return new_value;
});

/**
 * Parse the type definition
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.12
 */
PathParamDefinition.setMethod(function parseTypeDefinition() {

	if (this.is_parsed) {
		return;
	}

	this.is_parsed = true;

	if (!this.has_type_definition) {
		return;
	}

	let class_name,
	    field_name;

	if (typeof this.typedef == 'string') {
		this.uses_simple_typedef = !!PathDefinition.typedefs[this.typedef];

		// If it's not a simple type, the type is a class name
		if (!this.uses_simple_typedef) {
			class_name = this.typedef;
		}
	} else {

		let class_path = [],
		    field_path = [],
		    current = class_path;
	
		for (let piece of this.typedef) {
			if (piece[0] != piece[0].toUpperCase() || !String.isLetter(piece[0])) {
				current = field_path;
			}

			current.push(piece);
		}
		
		class_name = class_path.join('.');
		field_name = field_path.join('.');
	}

	if (class_name) {
		this.type_class_name = class_name;
		this.type_field_name = field_name;

		const Model = Classes.Alchemy.Model || Classes.Alchemy.Client.Model;

		this.type_class_constructor = Object.path(Model, class_name);

		if (this.type_class_constructor) {
			this.is_model_type = true;
		} else {
			this.type_class_constructor = Object.path(Classes.Alchemy, class_name) || Object.path(Classes, class_name);
		}
	}
});

/**
 * Check the value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {boolean|Pledge<boolean>}
 */
PathParamDefinition.setMethod(function castValueToType(value, conduit) {

	if (!this.is_parsed) {
		this.parseTypeDefinition();
	}

	let result;

	if (this.uses_simple_typedef) {
		result = PathDefinition.typedefs[this.typedef](value, this.name, conduit);
	} else if (this.type_class_constructor?.checkPathValue) {
		result = this.type_class_constructor.checkPathValue(value, this.name, this.type_field_name, conduit);
	}

	return result;
});


/**
 * Parse an original path value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Object|Pledge<Object>}
 */
PathParamDefinition.setMethod(function parsePathValue(original_value, conduit) {

	let result = {
		name     : this.name,
		value    : original_value,
		rejected : false,
		original_value,
	};

	if (this.has_type_definition) {
		let new_value = this.castValueToType(original_value, conduit);

		if (typeof new_value === 'undefined') {
			return false;
		}

		if (Pledge.isThenable(new_value)) {
			let pledge = new Pledge();

			Pledge.done(new_value, (err, new_value) => {

				if (err) {
					pledge.reject(err);
				} else {
					result.value = new_value;

					if (new_value == null) {
						result.rejected = true;
					}

					pledge.resolve(result);
				}
			});

			return pledge;
		}

		result.value = new_value;
	}

	return result;
});