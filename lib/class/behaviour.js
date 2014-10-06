/**
 * The Behaviour class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {Model}   model      Model instance
 * @param    {Object}  options    Behaviour options
 */
global.Behaviour = Function.inherits(function Behaviour(model, options) {

	var that = this;

	// The parent model instance
	this.model = model;

	// Merge options
	this.options = Object.assign(this.options||{}, options);

	if (typeof this.beforeFind === 'function') {
		model.on('finding', this.beforeFind);
	}

	if (typeof this.afterFind === 'function') {
		model.on('found', this.afterFind);
	}

	if (typeof this.beforeSave === 'function') {
		model.on('saving', this.beforeSave);
	}

	if (typeof this.afterSave === 'function') {
		model.on('saved', this.afterSave);
	}

	if (typeof this.beforeRemove === 'function') {
		model.on('removing', this.beforeRemove);
	}
});

/**
 * Return a behaviour instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   behaviourName    The singular name of the behaviour
 * @param    {Model}    model            Model instance
 * @param    {Object}   options          Behaviour options
 *
 * @return   {Behaviour}
 */
Behaviour.get = function get(behaviourName, model, options) {

	var fullName = behaviourName.camelize() + 'Behaviour';

	if (typeof alchemy.classes[fullName] === 'undefined') return false;

	return new alchemy.classes[fullName](model, options);
};