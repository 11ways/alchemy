/**
 * The Behaviour class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Behaviour = global.Behaviour = alchemy.classes.BaseClass.extend(function Behaviour() {

	/**
	 * The behaviour preInit
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {undefined}
	 */
	this.preInit = function preInit() {
		// Other components this component uses
		this.behaviours = {};
		
		// The calling model
		this.model = {};
		
		// Default options
		this.options = {};

		// Expose to the controller?
		this.expose = false;
	};

	/**
	 * The behaviour constructor
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Model}     model    Model instance
	 * @param    {Object}    options  Bhaviour options
	 *
	 * @return   {undefined}
	 */
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
	 * @param    {Object}     err
	 * @param    {Array}      results
	 * @param    {Boolean}    primary  If this was the originating model
	 * @param    {String}     alias    The alias used to store this result
	 */
	this.afterFind = function afterFind(next, err, results, primary, alias) {
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
	this.afterSave = function afterSave(next, record, errors, options) {
		next();
	};

	/**
	 * Called before a record is removed.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that is going to be removed
	 *
	 * @return void
	 */
	this.beforeRemove = function beforeRemove(next, record) {
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
 * @param   {String}   behaviourName       The singular name of the behaviour
 * @param   ...                            Other arguments
 */
Behaviour.get = function get(behaviourName) {

	var fullName = behaviourName.camelize() + 'Behaviour';
	
	if (typeof alchemy.classes[fullName] === 'undefined') return false;
	
	var args = Array.prototype.slice.call(arguments, 0);
	
	// Remove the first argument (which is the behaviour name)
	args.shift();

	var returnBehaviour	= new alchemy.classes[fullName]({__passArgs__: args});
	
	return returnBehaviour;
}