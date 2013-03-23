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

	/**
	 * Execute a method function from the parent.
	 * If we find a property that isn't a function,
	 * we simply return that value
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {string}   functionname   The name of the wanted property
	 */
	this.parent = function __parent__ (functionname) {
		
		// Where to find the parent function
		var _parent = this._parent;
		
		// Keep tabs on when we've reached the end of the call stack
		var reached_end = false;
		
		// Current arguments
		var _args = arguments;
		
		// Current caller
		var caller;
		
		// Current callee
		var callee;
		
		// Current level; how many 'parent' calls we've passed
		var level = 0;
		var check = 0;
		var classless = 0;
		
		do {
			
			check++;
			
			callee = _args.callee;
			caller = callee.caller;

			//var msg = 'Check ' + check + ' - ' + callee.name + ' has been called by: ' + caller.name;
			//if (typeof caller.arguments[0] == 'string') msg += ' [arg0:"' + caller.arguments[0] + '"]';
			//console.log(msg);
			
			// If the calling function is not part of a class, increase classless
			// When this counter gets too big, we stop looking for __parent__ functions
			if (!caller.__hasClass) classless++;
			
			// If there is no higher level, we've reached the end
			if (caller) {
				
				// Get the caller function name
				// If another '__parent__' has been called in the chain, increase the level!
				if (caller.name == '__parent__') {
					
					if (typeof _parent._parent != 'undefined') {
						
						// Get the parent scope of this parent
						_parent = _parent._parent;
						
						// If the next parent scope has the 'end' property set to tue, stop looking!
						if (typeof _parent._parent != 'undefined' && _parent._parent.__end__ === true) break;
					}
					
					level++;
				}level++;
				
				// Get this caller's arguments
				_args = caller.arguments;
			} else {
				reached_end = true;
			}
			
		} while (!reached_end && classless < 5);
		
		if (typeof _parent[functionname] == 'function') {
			// Turn the array-like arguments object into a real array
			var args = Array.prototype.slice.call(arguments);
			
			// Remove the function name
			args.shift();
			
			// Execute the parent function with the appropriate arguments
			return _parent[functionname].apply(this, args);
		} else if (typeof _parent[functionname] != 'undefined') {
			return _parent[functionname];
		} else {
			pr('Could not find parent property ' + functionname);
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
 * @param    {function}   extension   The extending class
 * @param    {object}     options     Extra options
 *
 * @returns  {function}   A new class
 */
BaseClass.extend = function extend (_extension, _options) {
	
	var extension = _extension;
	var options = _options;
	
	// Function overloading handler
	if (typeof _options != 'object') options = {};
	
	if (typeof _extension == 'string') options.name = _extension;
	
	if (typeof _options == 'function') extension = _options;
	
	if (!options.name) {
		options.name = '';
		if (extension.name) options.name = extension.name;
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
		
		// Apply the constructor for the extension
		extension.apply(this);
		
		// Indicate every function inside this instance is part of this class
		for (var i in this) if (typeof this[i] == 'function') this[i].__hasClass__ = true;
		
		// Do not execute the init function when creating a temporary object
		var arg = arguments[0];
		
		if (typeof arg == 'object' && arg.__extending__ === true) {
			// The __extending__ option was found, so init() is not called
		} else {
	
			if (typeof this.init != 'undefined') {
				this.init.apply(this, arguments);
			}
		}
	}
	
	// Use eval, that way we can set the function name (options.name)
	eval('var new_constructor = function ' + options.name + '(){internal_constructor.apply(this, arguments)}');
	
	// Go over every property in the parent class
	for (var i in _super) {
		
		// If the child does not contain the same property, add it
		if (typeof _child[i] == 'undefined') {
			new_constructor[i] = _super[i];

			// This isn't needed, we do this in the internal constructor
			//if (typeof new_constructor[i] == 'function') new_constructor[i].__hasClass__ = true;
			
		} else {
			// If it does have the same property, store it in the _parent object
			_super._parent[i] = _super[i];
			
			// This isn't needed, we do this in the internal constructor
			//if (typeof _child[i] == 'function') _child[i].__hasClass__ = true;
		}
		
	}

	new_constructor.prototype = _super;
	new_constructor.constructor = extension;
	
	// Set the name in the prototype, so objects will have this set correctly
	// Don't forget: once a function's .name has been set, it can't be changed
	new_constructor.prototype.name = options.name;
	
	return new_constructor;
}

alchemy.classes.BaseClass = BaseClass;