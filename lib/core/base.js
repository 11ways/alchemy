'use strict';
const CONDUIT = Symbol('conduit');

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
 * @version  1.0.0
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
	shared_group_prefix = this.shared_group_prefix || '';

	if (shared_group_prefix) {
		shared_group_prefix = shared_group_prefix.postfix('_');
	}

	// Do nothing further if this is meant to be extended only
	if (this.is_abstract_class) {

		if (this.starts_new_group !== false) {

			// This wrapper starts a new group
			this.setProperty('$group_parent', this.name);

			// If no group name has been defined, create one
			if (!this.prototype.hasOwnProperty('$group_name')) {
				group_name = this.name.underscore();
				this.setProperty('$group_name', group_name);
			} else {
				group_name = this.prototype.$group_name;
			}

			// And construct the shared group name
			shared_group_name = shared_group_prefix + group_name;

			// Set the group on the class itself
			this.setStatic('group', Blast.getGroup(shared_group_name));
		}

		// Set the title on the class itself, don't let children inherit it
		if (!this.hasOwnProperty('title')) {
			this.setStatic('title', this.name.titleize(), false);
		}

		// See if the type_name needs to be set automatically
		if (!this.hasOwnProperty('type_name')) {
			this.setStatic('type_name', this.name.underscore(), false);
		}

		return;
	}

	// Get the name this class might need to be grouped under
	group_name = this.prototype.$group_name;

	// Do nothing further if there is no group name
	if (!group_name) {

		// See if the type_name needs to be set automatically
		if (!this.hasOwnProperty('type_name')) {
			this.setStatic('type_name', this.name.underscore(), false);
		}

		// Do the same for the title
		if (!this.hasOwnProperty('title')) {
			this.setStatic('title', this.name.titleize(), false);
		}

		return;
	}

	// And construct the shared group name
	shared_group_name = shared_group_prefix + group_name;

	// Get the shared group object
	shared_group = Blast.getGroup(shared_group_name);

	// Set the name of the group it's a member of
	this.setStatic('of_group_name', shared_group_name, false);

	// Construct the regex to get the name
	regex = RegExp.interpret('/' + group_name + '$|' + this.prototype.$group_parent + '$/');

	// Get the name (without the parent name)
	name = this.name.replace(regex, '');

	// See if the type_name needs to be set automatically
	if (!this.hasOwnProperty('type_name')) {
		this.setStatic('type_name', name.underscore(), false);
	}

	// Do the same for the title
	if (!this.hasOwnProperty('title')) {
		this.setStatic('title', name.titleize(), false);
	}

	// Add this class to the shared group
	shared_group[this.type_name] = this;
});

/**
 * Make this an abstract class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Boolean}   value
 */
Base.setStatic(function makeAbstractClass(value) {

	if (value == null) {
		value = true;
	}

	this.setStatic('is_abstract_class', value, false);
});

/**
 * Make this start a new group
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Boolean}   value
 */
Base.setStatic(function startNewGroup(value) {

	var group_name;

	if (value == null) {
		value = true;
	}

	if (typeof value == 'string') {
		group_name = value;
		value = true;

		this.setProperty('$group_name', group_name);
	}

	this.setStatic('starts_new_group', value, false);
});

/**
 * Get all the children of this class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Base.setStatic(function getAllChildren() {

	var result = [],
	    i;

	if (!this.children) {
		return result;
	}

	for (i = 0; i < this.children.length; i++) {
		result.push(this.children[i]);
		result.include(this.children[i].getAllChildren());
	}

	return result;
});

/**
 * Find a member of this group
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  1.1.4
 */
Base.setStatic(function getMember(name) {

	if (!name) {
		throw new Error('Unable to get class member of ' + this.name + ', given name is empty');
	}

	if (this.group == null) {
		return null;
	}

	// See if it can be found by the exact name given
	if (this.group[name]) {
		return this.group[name];
	}

	let temp_name = name.camelize();

	if (this.group[temp_name]) {
		return this.group[temp_name];
	}

	// Try underscoring the name otherwise
	temp_name = name.underscore();

	if (this.group[temp_name]) {
		return this.group[temp_name];
	}
});

/**
 * Set a deprecated property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
Base.setStatic(function setDeprecatedProperty(old_key, new_key) {
	this.setProperty(old_key, function getter() {
		console.warn('Deprecated property:', old_key, 'is now', new_key);
		return this[new_key];
	}, function setter(val) {
		console.warn('Deprecated property:', old_key, 'is now', new_key);
		return this[new_key] = val;
	});
});

/**
 * Get path to this class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {String}
 */
Base.setStatic(function getClassPath() {

	if (this.namespace) {
		return this.namespace + '.' + this.name;
	}

	return this.name;
});

/**
 * Get path to this class, but after the given namespace piece
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   after   Only return the path after the given class
 *
 * @return   {String}
 */
Base.setStatic(function getClassPathAfter(after) {

	var namespace = this.namespace,
	    result,
	    pieces;

	if (after && namespace) {
		pieces = namespace.split('.').after(after);

		namespace = pieces.join('.');
	}

	if (namespace) {
		result = namespace + '.' + this.name;
	} else {
		result = this.name;
	}

	return result;
});

/**
 * Set the 'shared group' prefix
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  1.0.0
 */
Base.setStatic('shared_group_prefix', '');

/**
 * Is this an abstract class?
 * This property will not be inherited by children,
 * instead it'll always be set to false (unless overridden)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  1.0.0
 */
Base.setStatic('is_abstract_class', true, false);

/**
 * Does this class start a new group of children?
 * Like `is_abstract_class`, this does not get inherited.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  1.0.0
 */
Base.setStatic('starts_new_group', false);

/**
 * Get the attached conduit
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.8
 * @version  1.1.8
 *
 * @type     {Conduit}
 */
Base.setProperty(function conduit() {

	if (this[CONDUIT]) {
		return this[CONDUIT];
	}

	let renderer = this.renderer || this.view || this.hawkejs_view,
	    result;

	if (renderer && renderer.conduit) {
		result = renderer.conduit;
	} else if (renderer && renderer.root_renderer && renderer.root_renderer.conduit) {
		result = renderer.root_renderer.conduit;
	}

	if (!conduit && renderer && renderer.server_var) {
		result = renderer.server_var('conduit');
	}

	return result;

}, function setConduit(conduit) {
	return this[CONDUIT] = conduit;
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
 * Get path to this class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {String}
 */
Base.setMethod(function getClassPath() {
	return this.constructor.getClassPath();
});

/**
 * Get path to this class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   after   Only return the path after the given class
 *
 * @return   {String}
 */
Base.setMethod(function getClassPathAfter(after) {
	return this.constructor.getClassPathAfter(after);
});

/**
 * Call a method if it exists or do the callback
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.2.2
 */
Base.setMethod(function callOrNext(name, args, next) {

	if (arguments.length == 2 && typeof args == 'function') {
		next = args;
		args = [];
	}

	if (typeof this[name] == 'function') {

		if (next) {
			args.push(next);
		}

		try {
			this[name].apply(this, args);
		} catch (err) {
			next(err);
		}
	} else if (next) {
		next();

		return true;
	}
});


// PROTOBLAST START CUT

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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.1.8
 *
 * @param   {String}   name      The name of the model to get
 * @param   {Boolean}  init      Initialize the class [true]
 * @param   {Object}   options
 *
 * @return  {Model}
 */
Base.setMethod(function getModel(name, init, options) {

	var instance;

	if (typeof init != 'boolean') {
		options = init;
		init = true;
	}

	if (!init) {
		return Model.get(name, false);
	}

	if (!options) {
		options = {};
	}

	if (options.cache !== false) {
		if (!this._modelInstances) {
			this._modelInstances = {};
		} else {
			instance = this._modelInstances[name];
		}
	}

	let conduit = this.conduit;

	// If an instance already exists on this item,
	// and it has the same conduit (or none), return that
	if (instance && (instance.conduit == conduit)) {
		return instance;
	}

	instance = Model.get(name, options);

	if (conduit) {
		instance.attachConduit(conduit);
	}

	if (this._debugObject) {
		instance._debugObject = this._debugObject;
	}

	if (options.cache !== false) {
		this._modelInstances[name] = instance;
	}

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

// PROTOBLAST END CUT