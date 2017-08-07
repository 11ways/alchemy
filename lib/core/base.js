'use strict';

/**
 * Alchemy's Base class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
var Base = Function.inherits('Informer', 'Alchemy', function Base() {});

/**
 * Add group support to Protoblast
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
__Protoblast.getGroup = function getGroup(name) {

	if (!__Protoblast.ClassGroups) {
		__Protoblast.ClassGroups = {};
	}

	if (!__Protoblast.ClassGroups[name]) {
		__Protoblast.ClassGroups[name] = {};
	}

	return __Protoblast.ClassGroups[name];
};

/**
 * Set basic behaviour
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.3
 */
Base.constitute(function setBasicBehaviour() {

	var shared_group_prefix,
	    shared_group_name,
	    shared_group,
	    group_name,
	    regex,
	    title,
	    name;

	// Get the shared group prefix (or use the default one)
	shared_group_prefix = this.prototype.shared_group_prefix || '';

	if (shared_group_prefix) {
		shared_group_prefix = shared_group_prefix.postfix('_');
	}

	// Do not let children inherit the extend_only setting
	if (this.prototype.hasOwnProperty('is_abstract_class')) {

		// Do nothing further if this is meant to be extended only
		if (this.prototype.is_abstract_class) {

			if (this.prototype.hasOwnProperty('starts_new_group') && this.prototype.starts_new_group !== false) {

				// This wrapper starts a new group
				this.setProperty('group_parent', this.name);

				// If no group name has been defined, create one
				if (!this.prototype.hasOwnProperty('group_name')) {
					group_name = this.name.underscore();
					this.setProperty('group_name', group_name);
				} else {
					group_name = this.prototype.group_name;
				}

				// And construct the shared group name
				shared_group_name = shared_group_prefix + group_name;

				// Set the group on the class itself
				this.setStatic('group', Blast.getGroup(shared_group_name));
			}

			// See if the type_name needs to be set automatically
			if (!this.prototype.hasOwnProperty('type_name')) {
				this.setProperty('type_name', this.name.underscore());
			}

			// Do the same for the title
			if (!this.prototype.hasOwnProperty('title')) {
				this.setProperty('title', this.name.titleize());
			}

			// Set the title on the class itself, don't let children inherit it
			this.setStatic('title', this.prototype.title, false);

			return;
		}
	} else {
		this.setProperty('is_abstract_class', false);
		this.setProperty('starts_new_group', false);
	}

	// Get the name this class might need to be grouped under
	group_name = this.prototype.group_name;

	// Do nothing further if there is no group name
	if (!group_name) {

		// See if the type_name needs to be set automatically
		if (!this.prototype.hasOwnProperty('type_name')) {
			this.setProperty('type_name', this.name.underscore());
		}

		// Do the same for the title
		if (!this.prototype.hasOwnProperty('title')) {
			this.setProperty('title', this.name.titleize());
		}

		// Set the title on the class itself, don't let children inherit it
		this.setStatic('title', this.prototype.title, false);

		return;
	}

	// And construct the shared group name
	shared_group_name = shared_group_prefix + group_name;

	// Get the shared group object
	shared_group = Blast.getGroup(shared_group_name);

	// Set the name of the group it's a member of
	this.setStatic('of_group_name', shared_group_name, false);

	// Construct the regex to get the name
	regex = RegExp.interpret('/' + group_name + '$|' + this.prototype.group_parent + '$/');

	// Get the name (without the parent name)
	name = this.name.replace(regex, '');

	// See if the type_name needs to be set automatically
	if (!this.prototype.hasOwnProperty('type_name')) {
		this.setProperty('type_name', name.underscore());
	}

	// Do the same for the title
	if (!this.prototype.hasOwnProperty('title')) {
		this.setProperty('title', name.titleize());
	}

	// Set the title on the class itself, don't let children inherit it
	this.setStatic('title', this.prototype.title, false);

	// Add this class to the shared group
	shared_group[this.prototype.type_name] = this;
});

/**
 * Enable all inherited classes to get a class group
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Base.setMethod(function getClassGroup(name) {
	return __Protoblast.getGroup(name);
});

/**
 * Find a member of this group
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Base.setStatic(function getMember(name) {

	if (this.group == null) {
		return null;
	}

	// See if it can be found by the exact name given
	if (this.group[name]) {
		return this.group[name];
	}

	// Try underscoring the name otherwise
	name = name.underscore();

	if (this.group[name]) {
		return this.group[name];
	}
});

/**
 * Set the 'shared group' prefix
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Base.setProperty('shared_group_prefix', '');

/**
 * Is this an abstract class?
 * This property will not be inherited by children,
 * instead it'll always be set to false (unless overridden)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Base.setProperty('is_abstract_class', true);

/**
 * Does this class start a new group of children?
 * Like `is_abstract_class`, this does not get inherited.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Base.setProperty('starts_new_group', false);

// HAWKEJS START CUT

/**
 * Attach a conduit to a certain instance
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Conduit}   conduit
 */
Base.setMethod(function attachConduit(conduit) {
	this.conduit = conduit;
});

/**
 * Get a model, attach a conduit if possible
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param   {String}   modelName
 * @param   {Object}   options
 *
 * @return  {Model}
 */
Base.setMethod(function getModel(modelName, options) {

	var instance;

	if (!this._modelInstances) {
		this._modelInstances = {};
	} else {
		instance = this._modelInstances[modelName];
	}

	// If an instance already exists on this item,
	// and it has the same conduit (or none), return that
	if (instance && (instance.conduit == this.conduit)) {
		return instance;
	}

	instance = Model.get(modelName, options);

	if (this.conduit) {
		instance.attachConduit(this.conduit);
	}

	if (this._debugObject) {
		instance._debugObject = this._debugObject;
	}

	this._modelInstances[modelName] = instance;

	return instance;
});

/**
 * Create a debug entry
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param   {Number}   verbosity
 */
Base.setMethod(function debug(verbosity) {

	var duplicate,
	    options,
	    item,
	    args,
	    i = 0;

	if (typeof verbosity == 'object' && verbosity && (verbosity.label || verbosity.id || verbosity.unique)) {
		options = verbosity;
		verbosity = null;
		i = 1;
	}

	if (options == null) {
		options = {};
	}

	if (options.verbosity == null) {
		if (typeof verbosity == 'number') {
			i = 1;
			options.verbosity = verbosity;
		} else {
			options.verbosity = log.INFO;
		}
	}

	// Do nothing if debugging is off and verbosity is too high
	if (!alchemy.settings.debug && options.verbosity > log.ERROR) {
		return;
	}

	if (options.data == null) {
		args = [];

		for (; i < arguments.length; i++) {
			args.push(arguments[i]);
		}

		options.data = {args: args};
	}

	if (!options.namespace) {
		options.namespace = this.constructor.name;
	}

	if (options.unique) {
		// Generate fowler hash
		options.id = (options.data.args + '').fowler();
	}

	if (options.id) {
		if (!this._debug_seen_items) {
			this._debug_seen_items = {};
		}

		if (!this._debug_seen_items[options.id]) {
			this._debug_seen_items[options.id] = options;
			options.seen_count = 1;
		} else {
			// Do nothing if it has already been seen
			duplicate = this._debug_seen_items[options.id];
			duplicate.seen_count++;
		}
	}

	if (options.label) {
		if (this._debugObject) {
			item = this._debugObject.debug(options.label, options.data, options.verbosity);
		} else if (!this.conduit) {
			
		} else {
			item = new Classes.Alchemy.Debugger(this.conduit, options.label, options.verbosity);
			item.data = options.data;

			if (options.data && options.data.title) {
				item.title = options.data.title;
			}

			if (this.conduit.debuglog) this.conduit.debuglog.push(item);
		}

		return item;
	}

	if (!duplicate && alchemy.settings.debug && options.data && options.data.args) {
		if (typeof options.level != 'number') {
			options.level = 1;
		}

		alchemy.Janeway.print('debug', options.data.args, options);
	}

	return item;
});

/**
 * Create a debug mark
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param   {String}   message
 */
Base.setMethod(function debugMark(message) {
	if (this._debugObject) {
		this._debugObject.mark(message);
	}
});

/**
 * Add the getClassGroup method to the alchemy object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
alchemy.getClassGroup = __Protoblast.getGroup;

// HAWKEJS END CUT