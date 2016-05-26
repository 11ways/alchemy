/**
 * The Behaviour class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {Model}   model      Model instance
 * @param    {Object}  options    Behaviour options
 */
global.Behaviour = Function.inherits(function Behaviour(model, options) {

	// The parent model instance
	this.model = model;

	// Merge options
	this.options = Object.create(options);

	if (typeof this.beforeFind === 'function') {
		model.on('finding', this.beforeFind, this);
	}

	if (typeof this.afterFind === 'function') {
		model.on('found', this.afterFind, this);
	}

	if (typeof this.beforeSave === 'function') {
		model.on('saving', this.beforeSave, this);
	}

	if (typeof this.afterSave === 'function') {
		model.on('saved', this.afterSave, this);
	}

	if (typeof this.beforeRemove === 'function') {
		model.on('removing', this.beforeRemove, this);
	}
});

/**
 * Return a behaviour class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   behaviour_name    The singular name of the behaviour
 *
 * @return   {Function}
 */
Behaviour.getClass = function getClass(behaviour_name, model, options) {

	var full_name = behaviour_name.camelize() + 'Behaviour';

	if (alchemy.classes[full_name] == null) return false;

	return alchemy.classes[full_name];
};

/**
 * Return a behaviour instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {String}   behaviour_name    The singular name of the behaviour
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