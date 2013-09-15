/**
 * The Behaviour class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Behaviour = global.Behaviour = alchemy.classes.BaseClass.extend(function Behaviour(){
	
	// Other components this component uses
	this.behaviours = {};
	
	// The calling model
	this.model = {};
	
	// Default options
	this.options = {};

	// Expose to the controller?
	this.expose = false;
	
	// The model init, where models are loaded
	this.init = function init(model, options) {
		
		this.model = model;
		
		alchemy.inject(this.options, options);
	};
	
	/**
	 * Function that runs before every find operation
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next      The function to execute when we're done
	 * @param    {Object}    options   The find/query options
	 *
	 * @return   {undefined}
	 */
	this.beforeFind = function beforeFind(next, options) {
		next();
	};
	
	/**
	 * Function that runs after every find operation,
	 * with the result items passed
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}   next     The callback method, pass false to stop
	 */
	this.afterFind = function afterFind (next, err, results, primary) {
		next();
	};
	
	/**
	 * Called before the model saves a record,
	 * but after it has applied the strictFields
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 *
	 * @return void
	 */
	this.beforeSave = function beforeSave(next, record, options) {
		next();
	};
	
	/**
	 * Called after the model saves a record.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that has been saved
	 * @param    {Object}    errors
	 *
	 * @return void
	 */
	this.afterSave = function afterSave (next, record, errors) {
		next();
	};
});

/**
 * Return a behaviour instance
 * These are not cached
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   behaviourName       The singular name of the behaviour
 * @param   ...                            Other arguments
 */
Behaviour.get = function get(behaviourName) {

	var fullName = behaviourName.camelize() + 'Behaviour';
	
	if (typeof alchemy.classes[fullName] === 'undefined') return false;
	
	var args = Array.prototype.slice.call(arguments, 0);
	args.sort();
	
	// Remove the first argument (which is the component name)
	args.shift();
	
	var returnBehaviour = new alchemy.classes[fullName](args);
	
	return returnBehaviour;
}