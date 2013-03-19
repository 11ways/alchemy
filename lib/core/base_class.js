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

	// Call a parent function
	this.parent = function __parent__ (functionname) {
		
		// Where to find the parent function
		var _parent = this._parent;
		
		// Keep tabs on when we've reached the end of the call stack
		var reached_end = false;
		
		// Current arguments
		var _args = arguments;
		
		// Current caller
		var caller;
		
		// Current level; how many 'parent' calls we've passed
		var level = 0;
		
		do {
			caller = _args.callee.caller;

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
				}
				
				// Get this caller's arguments
				_args = caller.arguments;
			} else {
				reached_end = true;
			}
			
		} while (!reached_end);
		
		if (_parent[functionname]) {
			// Turn the array-like arguments object into a real array
			var args = Array.prototype.slice.call(arguments);
			
			// Remove the function name
			args.shift();
			
			// Add a final 

			// Execute the parent function with the appropriate arguments
			_parent[functionname].apply(this, args);
		}
	}
}

/**
 * The function that does the extending
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
BaseClass.extend = function extend (extension, options) {

	if (typeof options == 'undefined') options = {};
	if (typeof options.name == 'undefined') {
		options.name = '';
		if (extension.name) options.name = extension.name;
	}
console.log('This name & cons & extension: ' + this.name + ' - ' + this.constructor.name + ' - ' + extension.name);
	// Create a new instance of the class that is being extended
	var _super = new this({__extending__: true});

	// Create a temporary instance of the extension class
	var _child = new extension();

	// Save the old parent
	_super._parent = {_parent: _super._parent};
	
	var internal_constructor = function internal_constructor () {
		
		// Apply the constructor for the extension
		extension.apply(this);
		
		// Do not execute the init function when creating a temporary object
		var arg = arguments[0];
		
		if (typeof arg == 'object' && arg.__extending__ === true) {
			
		} else {
	
			if (typeof this.init != 'undefined') {
				this.init.apply(this, arguments);
			}
		}
	}
	
	// Use eval, that way we can set the function name
	eval('var new_constructor = function ' + options.name + '(){internal_constructor.apply(this, arguments)}');
	
	// Go over every property in the parent class
	for (var i in _super) {
		
		// If the child does not contain the same property, add it
		if (typeof _child[i] == 'undefined') {
			new_constructor[i] = _super[i];
		} else {
			// If it does have the same property, store it in the _parent object
			_super._parent[i] = _super[i];
		}
	}

	
	new_constructor.prototype = _super;
	new_constructor.constructor = extension;
	
	if (extension.name == 'ProductModel') {
		var t = new new_constructor();
		console.log('PM: ' + t.name + ' - ' + t.constructor.name + '--' + new_constructor.constructor.name);
	}
	
	return new_constructor;
}

alchemy.classes.BaseClass = BaseClass;