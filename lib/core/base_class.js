var EventEmitter = alchemy.use('events').EventEmitter;

/**
 * The base class, from which all other classes (should) inherit
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var BaseClass = function BaseClass () {
	
	// Simple property to indicate this is an extended class
	this._fromBaseClass = true;
	
	// Object to store parent functions & properties in
	this._parent = {__end__: true};
	
	// A link to the extend function
	this.extend = BaseClass.extend;
	
	// A link to the overload function
	this.overload = BaseClass.overload;
	
	/**
	 * Function that runs when this class is being extended
	 * 
	 * @type   {function}
	 */
	this.__extended__ = function __extended__ (parentClassName) {}
	
	/**
	 * Function that runs when this class is instanced (new)
	 *
	 * @type   {Function}
	 */
	this.init = function init () {}

	/**
	 * Execute a method function from the parent.
	 * If we find a property that isn't a function,
	 * we simply return that value
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {string}   functionname         The name of the wanted property
	 * @param    {boolean}  useCallingArguments  If true, the arguments from the
	 *                                           calling function will be applied
	 *                                           If an array, these will be applied
	 * @param    {array}    extraArguments       All other arguments will be applied
	 */
	this.parent = function __parent__ (functionname, useCallingArguments) {
		
		if (typeof useCallingArguments == 'undefined') useCallingArguments = true;
		
		var p = arguments.callee.caller;
		
		// Baseclass doesn't have an __ic__
		if (functionname == '__ic__' && p.__parentClass__ == 'BaseClass') return;
		
		// Where to find the parent function or property
		var _parent = alchemy.classes[p.__parentClass__];
		
		var possibleTarget = _parent[functionname];
		
		if (typeof possibleTarget == 'undefined') {
			possibleTarget = _parent.prototype[functionname];
		}
		
		if (typeof possibleTarget == 'function') {
			
			var args;
			
			// Use the arguments from the function that called us
			if (useCallingArguments === true) {
				args = arguments.callee.caller.arguments;
			} else if (useCallingArguments && (useCallingArguments instanceof Array || typeof useCallingArguments.length != 'undefined')) {
				// If it's an array, use those as arguments
				args = useCallingArguments;
			} else {
				// Turn the array-like arguments object into a real array
				args = Array.prototype.slice.call(arguments);
				
				// Remove the function name
				args.shift();
				
				// Remove the useCallingArguments
				args.shift();
			}
			
			// Execute the parent function with the appropriate arguments
			return possibleTarget.apply(this, args);
		} else if (typeof possibleTarget != 'undefined') {
			return possibleTarget;
		} else {
			log.warn('Could not find parent property ' + functionname.bold + ' from ' + p.__ownerClass__.bold + ' looking in ' + p.__parentClass__.bold + ' (Request context: ' + this.name + ')', {level: 1});
		}
	}
}

/**
 * The function that does the extending
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {function}   _extension   The extending class
 * @param    {object}     _options     Extra options
 * @param    {object}     _three       Depends on overloading...
 *
 * @returns  {function}   A new class
 */
BaseClass.extend = function extend (_extension, _options, _three) {
	
	var extension = _extension;
	var options = _options;
	var origin = this;
	
	// Function overloading handler
	if (typeof _options != 'object') {
		if (typeof _three == 'object') options = _three;
		else options = {};
	}
	
	if (typeof _extension == 'string') {
		origin = alchemy.classes[_extension];
	}
	
	if (typeof _options == 'function') extension = _options;
	
	// Register new classes by default in the alchemy.classes object
	if (typeof options.register == 'undefined') options.register = true;
	
	if (!options.name) {
		options.name = '';
		if (extension.name) {
			options.name = extension.name;
		} else {
			// If the extending function does not have a name, disable registering
			options.register = false;
		}
	}
	
	// Create a new instance of the class that is being extended
	// Passing the __extending__ option will make sure
	// the init() method is not called
	var _super = new this({__extending__: true});

	// Create a temporary instance of the extension class
	var _child = new extension();

	// Save the old parent
	_super._parent = {_parent: _super._parent};
	
	// Create the first part of the new constructor
	// We apply it later on inside new_constructor, this way we don't have to
	// put everything inside a big string
	var internal_constructor = function internal_constructor () {

		var arg = arguments[0];
	
		if (typeof arg == 'object' && arg.__extending__ === true) {
			
		} else {
			this.parent('__ic__', null, {__instancing__: true});
		}
		
		// Apply the constructor for the extension
		extension.apply(this);
		
		// It's ugly, but we need to call the __extended__ function, too
		if (typeof this.__extended__ == 'function') {
			this.__extended__(this.name, this);
		}
		
		if (typeof arg == 'object' && arg.__instancing__ === true) {
			
		} else {
			// Tell every function inside this class what its parent is
			for (var i in this) if (typeof this[i] == 'function') {
				this[i].__parentClass__ = this.parentClassName;
				this[i].__ownerClass__ = this.name;
			}
		}
		
		// Do not execute the init function when creating a temporary object
		if (typeof arg == 'object' && (arg.__extending__ === true || arg.__instancing__ === true)) {
			// The __extending__ option was found, so init() is not called
		} else {
	
			if (typeof this.init != 'undefined') {
				this.init.apply(this, arguments);
			}
		}
	}
	
	// Use eval to create the constructor for our new class,
	// that way we can set the class (function) name (options.name)
	eval('var new_constructor = function ' + options.name + '(){internal_constructor.apply(this, arguments)}');
	
	new_constructor.prototype = _super;
	new_constructor.__ic__ = internal_constructor;
	new_constructor.prototype.__ic__ = internal_constructor;
	
	for (var i in _child) {
		
		// Add the property to the class
		// This will be discarded when 'new' is called
		new_constructor[i] = _child[i];
		
		// Add the property to the prototype
		// Normally: This will be the default value of this property, shared accross all instances
		// BUT since these sames declarations are also INSIDE the function, they get overwritten
		new_constructor.prototype[i] = _child[i];
		
	}
	
	// Go over every property in the parent class
	for (var i in _super) {
		
		// If the child does not contain the same property, add the parent's property to the child
		if (typeof _child[i] == 'undefined') {
			new_constructor[i] = _super[i];
		} else {
			// If it does have the same property, store it in the _parent object
			_super._parent[i] = _super[i];
		}
		
	}
	
	// Now loop over new_constructor and tell it who its parent is
	for (var i in new_constructor) {
		
		if (typeof new_constructor[i] == 'function') {
			new_constructor[i].__parentClass__ = this.name;
			new_constructor.prototype[i].__parentClass__ = this.name;
			
			new_constructor[i].__ownerClass__ = options.name;
			new_constructor.prototype[i].__ownerClass__ = options.name;
		}
	}

	new_constructor.constructor = extension;
	
	// Set the name in the prototype, so objects will have this set correctly
	// Don't forget: once a function's .name has been set, it can't be changed
	new_constructor.prototype.name = options.name;
	
	// Also set the parent class name
	new_constructor.prototype.parentClassName = this.name;
	new_constructor.parentClassName = this.name;
	
	// Register the class if needed
	if (options.register) alchemy.classes[options.name] = new_constructor;
	
	if (typeof new_constructor.__extended__ == 'function') {
		new_constructor.__extended__(this.name, this);
	}
	
	alchemy.emit('ClassExtended-' . options.name);
	
	return new_constructor;
}

/**
 * Overloading is basically the same as extending a class,
 * but it overwrites the existing class.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {function}   _overload    The extending class
 * @param    {object}     _options     Extra options
 * @param    {object}     _three       Depends on overloading...
 *
 * @returns  {function}   A new class
 */
BaseClass.overload = function overload (_overload, _extra) {
	
	var className = this.name;
	
	if (typeof _overload == 'string') {
		className = _overload;
		_overload = _extra;
	}
	
	var _o = function _o () {
		
	}
	
	
}

// Add all the EventEmitter properties to the BaseClass
for (var i in EventEmitter.prototype) {
	BaseClass.prototype[i] = EventEmitter.prototype[i];
}

alchemy.classes.BaseClass = BaseClass;