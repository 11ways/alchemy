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
 * @param    {Object}   config   The settings of this definition
 * @param    {Group}    group    The parent group
 */
const Base = Function.inherits('Alchemy.Base', 'Alchemy.Setting', function Base(name, config, group) {

	// The parent group
	this.group = group;

	// The path of the setting in its group
	this.name = name;

	// The complete setting id
	this.setting_id = (group?.setting_id ? group.setting_id + '.' : '') + name;

	// The description
	this.description = config?.description;

	// Does this setting require any permission to view?
	this.view_permission = config?.view_permission;

	// Does this setting require any permission to edit?
	this.edit_persmission = config?.edit_persmission;
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

	Definition.super.call(this, name, config, group);

	// The type of the definition (string, number, etc)
	this.type = config.type;

	// Allowed values (makes it an enum)
	this.allowed_values = config.values || config.allowed_values;

	// Possible validation pattern
	this.validation_pattern = config.validation_pattern;

	// The default value
	this.default_value = config.default;

	// Is the default value an object?
	this.default_value_needs_cloning = this.default_value && typeof this.default_value == 'object';

	// Show a description?
	this.show_description = config.show_description;

	// Is this setting locked?
	// (Meaning: can not be edited in the frontend)
	this.locked = config.locked;

	// Does this setting require a reboot?
	this.requires_restart = config.requires_restart;

	// The intended target of this setting.
	// This is mostly used to differentiate between 'user' or 'visitor' settings
	this.target = config.target;

	// The action to execute
	this.action = config.action;

	// Optional global variable name to set when value changes
	this.global_variable = config.global_variable;

	// Other settings it might require (needs to be truthy)
	this.requires = config.requires ? Array.cast(config.requires) : undefined;

	// Other settings it might depend on
	this.depends_on = config.depends_on ? Array.cast(config.depends_on) : undefined;
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}           obj
 * @param    {boolean|string}   cloned
 *
 * @return   {Definition}
 */
Definition.setStatic(function unDry(obj, cloned) {

	let config = obj.config;

	let result = new Definition(config.name, config, null);
	result.setting_id = config.setting_id;

	return result;
});

/**
 * Get all the dependency ids
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {string[]}
 */
Definition.setProperty(function all_dependencies() {

	let result = [];

	if (this.depends_on) {
		if (Array.isArray(this.depends_on)) {
			result.push(...this.depends_on);
		} else {
			result.push(this.depends_on);
		}
	}

	if (this.requires) {
		let requires = Array.cast(this.requires);

		for (let entry of requires) {
			if (result.indexOf(entry) == -1) {
				result.push(entry);
			}
		}
	}

	return result;
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

		if (type == 'function') {
			type = 'string';
		}

		if (!type) {
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

	let result = new SettingValue(this);

	result.setDefaultValue(this.default_value);

	return result;
});

/**
 * Return the json-dry representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Definition.setMethod(function toDry() {

	let config = this.toJSON();

	return {
		value: {
			config,

			// Always convert the schema to the client-side version.
			// This saves us a lot of serialization headaches.
			schema : JSON.clone(this.schema, 'toHawkejs'),
		}
	};
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
		setting_id         : this.setting_id,
		allowed_values     : this.allowed_values,
		validation_pattern : this.validation_pattern,
		default_value      : this.default_value,
		show_description   : this.show_description,
		target             : this.target,
		view_permission    : this.view_permission,
		edit_persmission   : this.edit_persmission,
		requires_restart   : this.requires_restart,
		locked             : this.locked,
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
	result.schema = JSON.clone(this.schema, 'toHawkejs');
	return result;
});

/**
 * Get the configuration for the editor
 * (Including the current value)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Value}   root_value
 * @param    {Conduit} editor_context
 *
 * @return   {Object}
 */
Definition.setMethod(function getEditorConfiguration(root_value, editor_context) {

	let result = this.toEnumEntry();

	let value = root_value ? root_value.getPath(this.setting_id) : null;

	if (value) {
		result.current_value = value.get();
		result.current_value_is_default = value.has_default_value;
	}

	if (result.show_description !== false && this.description) {
		result.description = this.description;
	}

	if (this.edit_persmission && editor_context && !editor_context.hasPermission(this.edit_persmission)) {
		result.locked = true;
	}

	return result;
});

/**
 * Create a configuration object (for storing in the database)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Mixed}   new_value
 *
 * @return   {Object}
 */
Definition.setMethod(function createConfigurationObject(new_value) {

	// @TODO: make sure the value is valid
	let result = {
		value : new_value,
	};

	return result;
});

/**
 * Can this setting by edited by the given context?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Conduit}   permission_context
 *
 * @return   {boolean}
 */
Definition.setMethod(function canBeEditedBy(permission_context) {

	// Locked settings can never be edited
	if (this.locked) {
		return false;
	}

	// If no edit permission is required, it can be edited
	if (!this.edit_persmission) {
		return true;
	}

	// If no context is given, it can't be edited
	if (!permission_context) {
		return false;
	}

	return permission_context.hasPermission(this.edit_persmission);
});

/**
 * Execute the action (if any is linked)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Value}   value_instance
 */
Definition.setMethod(function executeAction(value_instance) {

	let value = value_instance.get();

	// Set the global variable if configured
	if (this.global_variable) {
		globalThis[this.global_variable] = value;
	}

	if (!this.action) {
		return;
	}

	return this.action.call(this, value, value_instance);
});

/**
 * The Setting Group class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name   The name of the setting in its (parent) group
 * @param    {Object}   config The settings of this definition
 * @param    {Group}    group  The parent group
 */
const Group = Function.inherits('Alchemy.Setting.Base', function Group(name, config, group) {

	if (!group) {
		if (config && config instanceof Group) {
			group = config;
			config = null;
		}
	}

	Group.super.call(this, name, config, group);

	// All the children
	this.children = new Map();

	// Weak references to existing values
	this.weak_values = new Blast.Classes.WeakValueSet();
});

/**
 * unDry the group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}           obj
 * @param    {boolean|string}   cloned
 *
 * @return   {Group}
 */
Group.setStatic(function unDry(obj, cloned) {

	let config = obj.config;

	let result = new Group(config.name, null, null);
	result.setting_id = config.setting_id;

	let children = obj.children,
	    child;

	for (child of children) {

		if (!child) {
			continue;
		}

		result.children.set(child.name, child);
		child.group = result;
	}

	return result;
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
 * Return the json-dry representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Group.setMethod(function toDry() {

	let config = {
		name             : this.name,
		setting_id       : this.setting_id,
		description      : this.description,
		view_permission  : this.view_permission,
		edit_persmission : this.edit_persmission,
	};

	let children = [...this.children.values()];

	return {
		value: {
			config,
			children,
		}
	};
});

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

	let pieces = name.split('.'),
	    current = this,
	    piece;

	if (pieces[0] == current.name) {
		pieces.shift();
	}

	while (pieces.length) {
		piece = pieces.shift();

		current = current.children.get(piece);

		if (!current) {
			return;
		}
	}

	return current;
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

	if (this.weak_values.size) {
		let group_value = group.generateValue();

		for (let existing of this.weak_values) {
			this.setDefaultValue(existing, {[name]: group_value});
		}
	}

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

	// Set the global variable immediately with the default value
	if (config.global_variable) {
		globalThis[config.global_variable] = config.default;
	}

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

	const result = new GroupValue(this);
	const object = {};

	let definition,
	    key;

	for ([key, definition] of this.children) {
		object[key] = definition.generateValue();
	}

	this.setDefaultValue(result, object);

	this.weak_values.add(result);

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
 * Set the values silently
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Value}   target
 * @param    {Mixed}                   value
 */
Group.setMethod(function setValueSilently(target, value) {

	if (!value || typeof value != 'object') {
		return;
	}

	if (value instanceof Value) {

		if (!value.is_group) {
			throw new Error('Cannot set default value of non-group value');
		}

		value = value[VALUE];
	}

	let object = this.assign(target[VALUE], value, false, false);
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

	let object = this.assign(target[VALUE], value, false, true);
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
 * @param    {boolean}  do_actions
 */
Group.setMethod(function assign(target, values, default_only, do_actions = true) {

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
			throw new Error('Cannot assign non-object values to setting_id "' + this.setting_id + '"');
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
			if (source_value && (typeof source_value == 'object' && !(source_value instanceof SettingValue))) {
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

			group.assign(target[key], values[key], default_only, do_actions);
			continue;
		}

		if (!current_value) {
			current_value = definition.generateValue();
			target[key] = current_value;
		}

		// Set the value by default
		if (default_only) {
			current_value.setDefaultValue(values[key]);
		} else if (do_actions) {
			current_value.setValue(values[key]);
		} else {
			current_value.setValueSilently(values[key]);
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
 * Get the configuration for the editor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Value}   root_value
 * @param    {Conduit} editor_context
 *
 * @return   {Object}
 */
Group.setMethod(function getEditorConfiguration(root_value, editor_context) {

	let result = {
		is_root   : this.group == null,
		name      : this.name,
		group_id  : this.setting_id,
		settings  : [],
		children  : [],
	};

	let definition,
	    key;

	for ([key, definition] of this.children) {

		if (definition.view_permission) {
			if (editor_context) {
				if (!editor_context.hasPermission(definition.view_permission)) {
					continue;
				}
			}
		}
		
		if (definition.is_group) {
			result.children.push(definition.getEditorConfiguration(root_value, editor_context));
			continue;
		}

		result.settings.push(definition.getEditorConfiguration(root_value, editor_context));
	}

	return result;
});

/**
 * The base Value class
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
});

/**
 * Mark this as an "abstract" class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Value.makeAbstractClass(true);

/**
 * Get the setting_id
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {string}
 */
Value.setProperty(function setting_id() {
	return this.definition.setting_id;
});

/**
 * A group value instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Group}   group   The definition of the group
 */
const GroupValue = Function.inherits('Alchemy.Setting.Value', function GroupValue(group) {

	GroupValue.super.call(this, group);

	this.has_default_value = false;
	this[VALUE] = {};
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}           obj
 * @param    {boolean|string}   cloned
 *
 * @return   {GroupValue}
 */
GroupValue.setStatic(function unDry(obj, cloned) {

	let result = new GroupValue(obj.group);

	for (let key in obj.children) {
		let value = obj.children[key];
		result[VALUE][key] = value;
	}

	return result;
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
GroupValue.setProperty(function is_group() {
	return true;
});

/**
 * Return the json-dry representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function toDry() {

	let definition = this.definition,
	    children = this[VALUE];

	return {
		value: {
			group : definition,
			children,
		}
	};
});

/**
 * Get this group as a simple object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function toObject() {

	let result = {},
	    entry,
	    key;

	for (key in this[VALUE]) {
		entry = this[VALUE][key];

		if (!entry) {
			continue;
		}

		result[key] = entry.toObject();
	}

	return result;
});

/**
 * Return the simple representation of this value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function toSimple() {
	return this.toObject();
});

/**
 * Get the configuration for the editor
 * (Including the current value)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*} editor_context
 *
 * @return   {Object}
 */
GroupValue.setMethod(function getEditorConfiguration(editor_context) {
	return this.definition.getEditorConfiguration(this, editor_context);
});

/**
 * Remove an entry
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function remove(name) {
	this[VALUE][name] = undefined;
});

/**
 * Get the proxy representation of this group value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function toProxyObject() {
	return new MagicGroupValue(this);
});

/**
 * Set the default value if no value has been set yet
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function setDefaultValue(value) {
	this.definition.setDefaultValue(this, value);
});

/**
 * Set the value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function setValue(value) {
	this.definition.setValue(this, value);
});

/**
 * Set the value silently
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function setValueSilently(value) {

	if (Array.isArray(value)) {
		let entry;

		for (entry of value) {

			if (!entry.setting_id) {
				continue;
			}

			this.setPathSilently(entry.setting_id, entry.configuration.value);
		}

		return;
	}

	this.definition.setValueSilently(this, value);
});

/**
 * Inject the given group value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function injectSubGroupValue(name, value) {
	this[VALUE][name] = value;
});

/**
 * Get all the setting values with executable actions in order.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return    {Alchemy.Setting.Value[]}   sorted_values
 */
GroupValue.setMethod(function getSortedValues() {

	let result = this.getFlattenedValues();

	// Try to sort the values by their dependencies,
	// aiming to maintain the current order as much as possible.
	// This is done by sorting the values by their dependencies,
	// and then sorting the dependencies by their dependencies.
	// This is done recursively.
	result.sortTopological('setting_id', 'all_dependencies');

	return result;
});

/**
 * Add all the values to the given array
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.Setting.Value[]}
 */
GroupValue.setMethod(function getFlattenedValues() {

	let result = [],
	    entry,
	    key;

	for (key in this[VALUE]) {
		entry = this[VALUE][key];

		if (!entry) {
			continue;
		}

		if (entry.is_group) {
			result.push(...entry.getFlattenedValues());
		} else {
			result.push(entry);
		}
	}

	return result;
});

/**
 * Get the value at the given path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Array}   path
 *
 * @return   {Value}
 */
GroupValue.setMethod(function get(path) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	if (path && this.definition.group == null && path[0] == this.definition.name) {
		path.shift();
	}

	if (!path || path.length == 0) {
		return this;
	}

	if (path.length == 1) {
		return this[VALUE][path[0]];
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
 * Set via a path (but silently).
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
GroupValue.setMethod(function setPathSilently(path, raw_value) {
	return this._setPath(true, path, raw_value);
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
GroupValue.setMethod(function setPath(path, raw_value) {
	return this._setPath(false, path, raw_value);
});

/**
 * Set via a path.
 * Any non-existing group will be created.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {boolean}        silent
 * @param    {string|Array}   path
 * @param    {Mixed}          raw_value
 *
 * @return   {Value}
 */
GroupValue.setMethod(function _setPath(silent, path, raw_value) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	if (this.definition.group == null && path[0] == this.definition.name) {
		path.shift();
	}

	let object = Object.setPath({}, path, raw_value);

	if (silent) {
		this.setValueSilently(object);
	} else {
		this.setValue(object);
	}

	return this.getPath(path);
});

/**
 * Force a value at the given path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Array}   path
 * @param    {Value}
 */
GroupValue.setMethod(function forceValueInstanceAtPath(path, value) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	if (this.definition.group == null && path[0] == this.definition.name) {
		path.shift();
	}

	let last = path.pop();

	let current = this;

	while (path.length && current) {
		let next = path.shift();
		current = current.get(next);
	}

	current[VALUE][last] = value;
});

/**
 * Convert to a datasource array
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(function toDatasourceArray() {

	let result = [],
	    flattened = this.getFlattenedValues(),
	    entry;

	for (entry of flattened) {

		if (entry.has_default_value) {
			continue;
		}

		result.push({
			setting_id    : entry.setting_id,
			configuration : {
				value : entry.get(),
			}
		});
	}

	return result;
});

/**
 * A value instance of a setting
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Setting.Definition}   definition   The definition of the setting
 */
const SettingValue = Function.inherits('Alchemy.Setting.Value', function SettingValue(definition) {

	SettingValue.super.call(this, definition);

	// Is this the default value?
	// meaning: this value does not come from any manual override
	// (Groups do not have default values)
	this.has_default_value = true;

	// The actual value
	this[VALUE] = null;

	// How many times the action has been executed
	this.action_execution_count = 0;
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}           obj
 * @param    {boolean|string}   cloned
 *
 * @return   {SettingValue}
 */
SettingValue.setStatic(function unDry(obj, cloned) {

	let result = new this(obj.definition);

	result[VALUE] = obj.value;
	result.has_default_value = obj.has_default_value;

	return result;
});

/**
 * Get all the dependency ids
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {string[]}
 */
SettingValue.setProperty(function all_dependencies() {
	return this.definition.all_dependencies;
});

/**
 * Return the json-dry representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SettingValue.setMethod(function toDry() {
	return {
		value: {
			definition        : this.definition,
			value             : this[VALUE],
			has_default_value : this.has_default_value,
		}
	};
});

/**
 * Get this group as a simple object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SettingValue.setMethod(function toObject() {
	return this.get();
});

/**
 * Return the simple representation of this value.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SettingValue.setMethod(function toSimple() {
	return this.get();
});

/**
 * Get the current value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SettingValue.setMethod(function get(key) {
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
SettingValue.setMethod(function setDefaultValue(value) {

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
SettingValue.setMethod(function setValueSilently(value) {

	if (value instanceof Value) {
		value = value[VALUE];
	}

	// Even though the default value and this new value might be the same,
	// it is no longer considered to be the "default" value!
	this.has_default_value = false;

	value = this.definition.cast(value);

	this[VALUE] = value;
});

/**
 * Test and set the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SettingValue.setMethod(function setValue(value) {
	this.setValueSilently(value);
	return this.executeAction();
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
 * Force a value at the given path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Array}   path
 * @param    {Value}
 */
Value.setMethod(function forceValueInstanceAtPath(path, value) {
	throw new Error('Unable to perform on a simple Value instance');
});

if (Blast.isBrowser) {
	return;
}

/**
 * Custom Janeway representation (left side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {string}
 */
Value.setMethod(Symbol.for('janeway_arg_left'), function janewayClassIdentifier() {
	return 'A.S.' + this.constructor.name;
});

/**
 * Custom Janeway representation (right side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {String}
 */
Value.setMethod(Symbol.for('janeway_arg_right'), function janewayInstanceInfo() {
	return this.definition.setting_id;
});

/**
 * Perform all the actions of this group and its children
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
GroupValue.setMethod(async function performAllActions() {

	let sorted = this.getSortedValues();

	for (let value of sorted) {
		let result = value.executeAction();

		if (result) {
			await result;
		}
	}
});

/**
 * Execute the action (if any is linked)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SettingValue.setMethod(function executeAction() {
	this.action_execution_count++;
	return this.definition.executeAction(this);
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

	let result = this[key];

	if (result != null) {
		return result;
	}

	result = this[VALUE].get(key);

	if (result == null) {
		return this[VALUE][key];
	}

	if (!result) {
		return result;
	}

	if (result.is_group) {
		return result.toProxyObject();
	}

	if (!result.get) {
		return result;
	}

	return result.get();
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
MagicGroupValue.setMethod(function __ownKeys() {
	return Object.keys(this[VALUE].toObject())
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
MagicGroupValue.setMethod(function __describe(key) {
	let result = Object.getOwnPropertyDescriptor(this[VALUE], key);

	if (result == null) {
		result = Object.getOwnPropertyDescriptor(this, key);
	}

	return result;
});