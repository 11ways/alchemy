/**
 * The Behaviour class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {Model}   model      Model instance
 * @param    {Object}  options    Behaviour options
 */
global.Behaviour = Function.inherits('Alchemy.Base', function Behaviour(model, options) {

	// The parent model instance
	this.model = model;

	// Merge options
	this.options = Object.create(options);
});

/**
 * Return a behaviour class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {string}   behaviour_name    The singular name of the behaviour
 *
 * @return   {Function}
 */
Behaviour.getClass = function getClass(behaviour_name, model, options) {

	var full_name = behaviour_name.camelize() + 'Behaviour';

	if (Classes.Alchemy[full_name] == null) return false;

	return Classes.Alchemy[full_name];
};

/**
 * Return a behaviour instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {string}   behaviour_name    The singular name of the behaviour
 * @param    {Model}    model             Model instance
 * @param    {Object}   options           Behaviour options
 *
 * @return   {Behaviour}
 */
Behaviour.get = function get(behaviour_name, model, options) {

	var constructor = this.getClass(behaviour_name);

	if (!constructor) {
		return false;
	}

	return new constructor(model, options);
};