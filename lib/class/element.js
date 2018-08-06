/**
 * Custom alchemy elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Element = Function.inherits('Hawkejs.Element', 'Alchemy.Element', function Element() {
	return Element.super.call(this);
});

/**
 * The default element prefix (when element contains no hyphen) is "al"
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Function.getNamespace('Alchemy.Element').setStatic('default_element_prefix', 'al');

/**
 * Get a client-side model, attach a conduit if possible
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param   {String}   model_name
 * @param   {Object}   options
 *
 * @return  {Model}
 */
Element.setMethod(function getModel(model_name, options) {

	var instance;

	if (!this._model_instances) {
		this._model_instances = {};
	} else {
		instance = this._model_instances[model_name];
	}

	// If an instance already exists on this item,
	// and it has the same conduit (or none), return that
	if (instance && (instance.conduit == this.conduit)) {
		return instance;
	}

	let ModelClass = Blast.Classes.Alchemy.Client.Model[model_name.classify()];

	instance = new ModelClass();

	if (this.conduit) {
		instance.conduit = this.conduit;
	}

	if (this.hawkejs_view) {
		instance.hawkejs_view = this.hawkejs_view;
	}

	this._model_instances[model_name] = instance;

	return instance;
});