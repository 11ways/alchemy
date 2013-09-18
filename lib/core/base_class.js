var EventEmitter = alchemy.use('events').EventEmitter;

/**
 * The base class, from which all other classes (should) inherit
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var BaseClass = function BaseClass() {
	
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
	 * @type   {Function}
	 */
	this.__extended__ = function __extended__(parentClassName) {};
	
	/**
	 * Function that runs when this class is instanced (new)
	 *
	 * @type   {Function}
	 */
	this.init = function init() {};

	/**
	 * Execute a method function from the parent.
	 * If we find a property that isn't a function,
	 * we simply return that value
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   functionname         The name of the wanted property
	 * @param    {Boolean}  useCallingArguments  If true, the arguments from the
	 *                                           calling function will be applied
	 *                                           If an array, these will be applied
	 * @param    {Array}    extraArguments       All other arguments will be applied
	 */
	this.parent = function __parent__(functionname, useCallingArguments) {
		
		if (typeof useCallingArguments === 'undefined') useCallingArguments = true;
		
		var p = arguments.callee.caller;
		
		// Baseclass doesn't have an __ic__ function
		if (functionname === '__ic__' && p.__parentClass__ === 'BaseClass') return;
		
		// Where to find the parent function or property
		var _parent = alchemy.classes[p.__parentClass__];
		
		var possibleTarget = _parent[functionname];
		
		if (typeof possibleTarget === 'undefined') {
			possibleTarget = _parent.prototype[functionname];
		}
		
		if (typeof possibleTarget === 'function') {
			
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
		} else if (typeof possibleTarget !== 'undefined') {
			return possibleTarget;
		} else {
			log.warn('Could not find parent property ' + functionname.bold + ' from ' + p.__ownerClass__.bold + ' looking in ' + p.__parentClass__.bold + ' (Request context: ' + this.name + ')', {level: 1});
		}
	};

	/**
	 * A callback for when this an instance of this class has been augmented
	 */
	this.augmented = function augmented() {};
}

/**
 * The function that does the extending
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   _extension   The extending class
 * @param    {Object}     _options     Extra options
 * @param    {Object}     _three       Depends on overloading...
 *
 * @returns  {Function}   A new class
 */
BaseClass.extend = function extend(_extension, _options, _three, _callback) {
	
	var origin    = this,        // The originating class
	    options   = _options,
	    callback  = _callback,
	    extension = _extension;  // The new, extending class
	
	// Function overloading handler
	if (typeof _options != 'object') {
		if (typeof _three == 'object') {
			options = _three;
			_three = undefined;
		}
		else options = {};
	}
	
	if (typeof _options == 'function') {
		extension = _options;
		_options = undefined;
	}
	
	if (typeof _extension == 'string') {
		origin = alchemy.classes[_extension];
	}
	
	if (typeof extension != 'function') {
		if (typeof _three == 'function') {
			extension = _three;
		}
	}

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
	var _super = new origin({__extending__: true, __overloading__: options.overloading});

	// Create a temporary instance of the extension class
	// Since no extension has happened yet, no BaseClass magic is inside this
	// class. It won't do anything funky.
	var _child = new extension();

	// Save the old parent
	_super._parent = {_parent: _super._parent};
	
	// Create the first part of the new constructor
	// We apply it later on inside new_constructor, this way we don't have to
	// put everything inside a big string
	var internal_constructor = function internal_constructor() {

		var arg      = arguments[0],
		    passArgs = arguments;
	
		// If this constructor is called because we're creating a temporary
		// class used for extending another class, don't call the parent __ic__
		if (typeof arg === 'object' && arg.__extending__ === true) {
			
		} else {
			// Do call the parent internal constructor, and tell it we're instancing
			this.parent('__ic__', null, {__instancing__: true});
		}
		
		// Apply the constructor for the extension
		extension.apply(this);
		
		// It's ugly, but we need to call the __extended__ function, too
		if (typeof this.__extended__ === 'function') {
			this.__extended__(this.name, this);
		}
		
		if (typeof arg === 'object' && arg.__instancing__ === true) {
			
		} else {
			// Tell every function inside this class what its parent is
			for (var i in this) if (typeof this[i] == 'function') {
				this[i].__parentClass__ = this.parentClassName;
				this[i].__ownerClass__ = this.name;
			}
		}
		
		// Do not execute the init function when creating a temporary object
		if (typeof arg === 'object' && (arg.__extending__ === true || arg.__instancing__ === true)) {
			// The __extending__ option was found, so init() is not called
			// __instancing__ was also found, so don't call any parent init() functions
		} else {
	
			if (typeof this.init !== 'undefined') {

				if (typeof arg === 'object' && arg.__passArgs__) {
					passArgs = arg.__passArgs__;
				}

				this.init.apply(this, passArgs);
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
			new_constructor[i].__parentClass__ = origin.name;
			new_constructor.prototype[i].__parentClass__ = origin.name;
			
			new_constructor[i].__ownerClass__ = options.name;
			new_constructor.prototype[i].__ownerClass__ = options.name;
		}
	}

	new_constructor.constructor = extension;
	
	// Set the name in the prototype, so objects will have this set correctly
	// Don't forget: once a function's .name has been set, it can't be changed
	new_constructor.prototype.name = options.name;
	
	// Also set the parent class name
	new_constructor.prototype.parentClassName = origin.name;
	new_constructor.parentClassName = origin.name;
	
	// Register the class if needed
	if (options.register) {
		
		var _doRegister = true;
		
		if (!options.overloading && typeof alchemy.classes[options.name] != 'undefined') {
			log.error('You are overloading an object by using the extending function. Use overload instead', {level: 1});
		}
		
		if (_doRegister) alchemy.classes[options.name] = new_constructor;
	}
	
	if (typeof new_constructor.__extended__ == 'function') {
		new_constructor.__extended__(origin.name, origin);
	}
	
	alchemy.emit('ClassExtended-' + options.name);
	
	if (options.overloading) {
		
		if (typeof new_constructor.__overloaded__ == 'function') {
			new_constructor.__overloaded__(origin.name, origin);
		}
		
		alchemy.emit('ClassOverloaded-' + options.name);
	}

	return new_constructor;
};

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
BaseClass.overload = function overload(_overload, _extra) {
	
	log.verbose('Overload base: ' + this.name);
	
	var className = this.name;
	
	if (typeof _overload == 'string') {
		className = _overload;
		_overload = _extra;
	}
	
	log.verbose('Overload name overwritten: ' + className);
	
	// The actual function that does the overloading
	var _o = function _o () {
		var base = alchemy.classes[className];
		base.extend(_overload, {overloading: true});
	}
	
	if (typeof alchemy.classes[className] != 'undefined') {
		_o();
	} else {
		
		// If the class does not exist yet, wait 'till it does
		alchemy.once('ClassExtended-' + className, function() {
			_o();
		});
	}
	
};

// Add all the EventEmitter properties to the BaseClass
for (var i in EventEmitter.prototype) {
	BaseClass.prototype[i] = EventEmitter.prototype[i];
}

alchemy.classes.BaseClass = global.BaseClass = BaseClass;