const SettingNs = Function.getNamespace('Alchemy.Setting');
const VALUE = Symbol('value');

/**
 * The Base Setting Definition class.
 * These settings are stored in some kind of database.
 * They differ from `alchemy.settings`: those are hard-coded.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name     The name of the setting in its group
 * @param    {Group}    group    The parent group
 */
const Base = Function.inherits('Alchemy.Base', 'Alchemy.Setting', function Base(name, group) {

	// The parent group
	this.group = group;

	// The path of the setting in its group
	this.name = name;

	// The complete setting id
	this.setting_id = (group?.setting_id ? group.setting_id + '.' : '') + name;

	if (this.setting_id === 'system.debugging.logging.definition') {
		throw new Error('WRONG')
	}
});

/**
 * Is this a group?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {boolean}
 */
Base.setProperty('is_group', false);

/**
 * The Base Setting Definition class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name     The name of the setting in its group
 * @param    {Object}   config   The settings of this definition
 * @param    {Group}    group    The parent group
 */
const Definition = Function.inherits('Alchemy.Setting.Base', function Definition(name, config, group) {

	Definition.super.call(this, name, group);

	// The type of the definition (string, number, etc)
	this.type = config.type;

	// Allowed values (makes it an enum)
	this.allowed_values = config.values || config.allowed_values;

	// Possible validation pattern
	this.validation_pattern = config.validation_pattern;

	// The default value
	this.default_value = config.default;

	// The description
	this.description = config.description;

	// Is the default value an object?
	this.default_value_needs_cloning = this.default_value && typeof this.default_value == 'object';

	// Show a description?
	this.show_description = config.show_description;

	// The intended target of this setting.
	// This is mostly used to differentiate between 'user' or 'visitor' settings
	this.target = config.target;
});

/**
 * Get the schema of this setting
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Definition.enforceProperty(function schema(new_value, old_value) {

	if (new_value == null) {
		new_value = alchemy.createSchema();

		let type = this.type;

		if (type == 'primitive') {
			type = 'string';
		} 

		if (type == 'percentage') {
			type = 'integer';
		}

		if (type == 'path') {
			type = 'string';
		}

		if (type == 'duration') {
			type = 'string';
		}

		new_value.addField('value', type, {
			description: this.description,
			allowed_values: this.allowed_values,
			validation_pattern: this.validation_pattern,
			default: this.default_value,
		});
	}

	return new_value;
});

/**
 * Cast the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Mixed}
 */
Definition.setMethod(function cast(value) {

	if (value == null) {
		return value;
	}

	if (this.type == 'boolean') {
		if (value === 'false') {
			value = false;
		} else if (value === 'true') {
			value = true;
		} else {
			value = !!value;
		}
	} else if (this.type == 'primitive') {
		let nr = Number(value);

		if (!isNaN(nr)) {
			value = nr;
		}
	} else if (this.type == 'percentage' || this.type == 'integer') {
		value = parseInt(value);
	} else if (this.type == 'number') {
		value = Number(value);
	}

	return value;
});

/**
 * Create the settings with default values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.Setting.Value}
 */
Definition.setMethod(function generateValue() {

	let result = new Value(this);

	result.setDefaultValue(this.default_value);

	return result;
});

/**
 * Return the json representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Definition.setMethod(function toJSON() {

	let result = {
		name               : this.name,
		type               : this.type,
		allowed_values     : this.allowed_values,
		validation_pattern : this.validation_pattern,
		default_value      : this.default_value,
		show_description   : this.show_description,
		target             : this.target,
	};

	return result;
});

/**
 * Create an enum entry
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Definition.setMethod(function toEnumEntry() {
	let result = this.toJSON();
	result.schema = this.schema;
	return result;
});

/**
 * The Setting Group class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name   The name of the setting in its (parent) group
 * @param    {Group}    group  The parent group
 */
const Group = Function.inherits('Alchemy.Setting.Base', function Group(name, group) {
	Group.super.call(this, name, group);

	// All the children
	this.children = new Map();
});

/**
 * Is this a group?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {boolean}
 */
Group.setProperty('is_group', true);

/**
 * Get a child
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name
 *
 * @return   {Alchemy.Setting.Group|Alchemy.Setting.Definition}
 */
Group.setMethod(function get(name) {
	return this.children.get(name);
});

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name
 *
 * @return   {Alchemy.Setting.Group}
 */
Group.setMethod(function createGroup(name) {

	let existing = this.get(name);

	if (existing) {
		throw new Error('Cannot create setting group "' + name + '", it already exists');
	}

	let group = new Group(name, this);
	this.children.set(name, group);

	return group;
});

/**
 * Add a setting
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name
 * @param    {Object}   config
 *
 * @return   {Alchemy.Setting.Definition}
 */
Group.setMethod(function addSetting(name, config) {
	
	let existing = this.get(name);

	if (existing) {
		throw new Error('Cannot create setting "' + name + '", it already exists');
	}

	let setting = new Definition(name, config, this);
	this.children.set(name, setting);

	return setting;
});

/**
 * Create the settings with default values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Group.setMethod(function generateValue() {

	const result = new Value(this);
	const object = {};

	let definition,
	    key;

	for ([key, definition] of this.children) {
		object[key] = definition.generateValue();
	}

	this.setDefaultValue(result, object);

	return result;
});


/**
 * Set the default value if no value has been set yet
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Value}   target
 * @param    {Mixed}                   value
 */
Group.setMethod(function setDefaultValue(target, value) {

	if (!value || typeof value != 'object') {
		return;
	}

	if (value instanceof Value) {

		if (!value.is_group) {
			throw new Error('Cannot set default value of non-group value');
		}

		value = value[VALUE];
	}

	let object = this.assign(target[VALUE], value, true);
	target[VALUE] = object;

	return target;
});

/**
 * Set the value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Value}   target
 * @param    {Mixed}                   value
 */
Group.setMethod(function setValue(target, value) {

	if (!value || typeof value != 'object') {
		return;
	}

	if (value instanceof Value) {

		if (!value.is_group) {
			throw new Error('Cannot set default value of non-group value');
		}

		value = value[VALUE];
	}

	let object = this.assign(target[VALUE], value, false);
	target[VALUE] = object;

	return target;
});

/**
 * Apply the given values to the given object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   target
 * @param    {Object}   values
 * @param    {boolean}  default_only
 */
Group.setMethod(function assign(target, values, default_only) {

	if (!Object.isPlainObject(target)) {
		if (target.is_group) {
			target = target[VALUE];
		} else {
			throw new Error('Cannot assign values to non-object');
		}
	}

	if (!values) {
		return target;
	}

	if (!Object.isPlainObject(values)) {
		if (values.is_group) {
			values = values[VALUE];
		} else {
			throw new Error('Cannot assign non-object values');
		}
	}

	let current_value,
	    source_value,
	    definition,
	    group,
	    key;

	for (key in values) {

		definition = this.get(key);
		current_value = target[key];
		source_value = values[key];

		if (!definition) {
			if (source_value && typeof source_value == 'object') {
				definition = new Group(key, this);
			} else {
				definition = new Definition(key, {}, this);
			}
		}

		if (definition.is_group) {
			group = definition;
		} else {
			group = null;
		}

		// Make sure it's correct
		if (group) {
			if (!target[key] || typeof target[key] !== 'object') {
				target[key] = group.generateValue();
			}

			group.assign(target[key], values[key], default_only);
			continue;
		}

		if (!current_value) {
			current_value = definition.generateValue();
			target[key] = current_value;
		}

		// Set the value by default
		if (default_only) {
			current_value.setDefaultValue(values[key]);
		} else {
			current_value.setValue(values[key]);
		}
	}

	return target;
});

/**
 * Create a recursive flat map
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {boolean}   add_groups
 *
 * @return   {Map}
 */
Group.setMethod(function createFlatMap(add_groups = false) {
	return this._addToMap(new Map(), add_groups);
});

/**
 * Add to the given map
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {boolean}   add_groups
 *
 * @return   {Map}
 */
Group.setMethod(function _addToMap(map, add_groups = false) {

	let definition,
	    key,
	    id;
	
	for ([key, definition] of this.children) {

		if (definition.is_group) {
			if (add_groups) {
				// @TODO
			}

			definition._addToMap(map, add_groups);
			continue;
		}

		id = definition.setting_id;
		map.set(id, definition.toEnumEntry());
	}

	return map;
});


/**
 * Create the backed map for use in enums
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.Map.Enum}
 */
Group.setMethod(function createEnumMap() {
	return new Classes.Alchemy.Map.Enum(() => {
		return this.createFlatMap();
	});
});

/**
 * A value instance of a setting/group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Base}   definition   The definition or group
 */
const Value = Function.inherits('Alchemy.Setting.Base', function Value(definition) {

	// The definition of this setting
	this.definition = definition;

	// Is this the default value?
	// meaning: this value does not come from any manual override
	// (Groups do not have default values)
	this.has_default_value = !definition.is_group;

	// The actual value
	this[VALUE] = definition.is_group ? {} : null;
});

/**
 * Is this a group?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {boolean}
 */
Value.setProperty(function is_group() {
	return this.definition.is_group;
});

/**
 * Get this group as a simple object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Value.setMethod(function toObject() {

	if (!this.is_group) {
		return this.get();
	}

	let result = {},
	    key;

	for (key in this[VALUE]) {
		result[key] = this[VALUE][key].toObject();
	}

	return result;
});

/**
 * Get the proxy representation of this group value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Value.setMethod(function toProxyObject() {

	if (!this.is_group) {
		throw new Error('Cannot create proxy for non-group value');
	}

	return new MagicGroupValue(this);
});

/**
 * Get the current value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Value.setMethod(function get(key) {
	let result = this[VALUE];

	if (key != null) {
		result = result[key];
	}

	return result;
});

/**
 * Set the default value if no value has been set yet
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Value.setMethod(function setDefaultValue(value) {

	if (this.is_group) {
		this.definition.setDefaultValue(this, value);
		return;
	}

	if (!this.has_default_value) {
		return;
	}

	if (value != null && typeof value == 'object') {

		if (value instanceof Value) {
			value = value[VALUE];
		}

		if (value && typeof value == 'object') {
			value = JSON.clone(value);
		}
	}

	this[VALUE] = value;
});

/**
 * Set the value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Value.setMethod(function setValue(value) {

	// Even though the default value and this new value might be the same,
	// it is no longer considered to be the "default" value!
	this.has_default_value = false;

	if (this.is_group) {
		this.definition.setValue(this, value);
		return;
	}

	value = this.definition.cast(value);

	this[VALUE] = value;
});

/**
 * Get via a path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Array}   path
 *
 * @return   {Value}
 */
Value.setMethod(function getPath(path) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	if (this.is_group && this.definition.group == null && path[0] == this.definition.name) {
		path.shift();
	}

	let current = this,
	    piece;

	while (path.length) {
		piece = path.shift();

		current = current.get(piece);

		if (!current) {
			return null;
		}
	}

	return current;
});

/**
 * Set via a path.
 * Any non-existing group will be created.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Array}   path
 * @param    {Mixed}          raw_value
 *
 * @return   {Value}
 */
Value.setMethod(function setPath(path, raw_value) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	if (this.is_group && this.definition.group == null && path[0] == this.definition.name) {
		path.shift();
	}

	let object = Object.setPath({}, path, raw_value);

	this.setValue(object);

	return this.getPath(path);
});

/**
 * A magic value getter
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Value}   value   The value group
 */
const MagicGroupValue = Function.inherits('Magic', 'Alchemy.Setting', function MagicGroupValue(group_value) {

	if (!group_value) {
		throw new Error('Cannot create magic group value without group value');
	}

	this[VALUE] = group_value;
});

/**
 * The magic getter
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   key
 */
MagicGroupValue.setMethod(function __get(key) {

	let result = this[VALUE].get(key);

	if (!result) {
		return;
	}

	if (result.is_group) {
		return result.toProxyObject();
	}

	return result.get();
});