/**
 * Custom alchemy elements
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
const Element = Function.inherits('Hawkejs.Element', 'Alchemy.Element', 'Element');

/**
 * Let Alchemy handle the stylesheets of custom elements
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Element.setStylesheetHandler(function handleStylesheet(path) {

	if (!path || Blast.isBrowser) {
		return;
	}

	alchemy.registerRequiredStylesheet(path);
});

/**
 * The default element prefix (when element contains no hyphen) is "al"
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Function.getNamespace('Alchemy.Element').setStatic('default_element_prefix', 'al');

/**
 * Get the current URL
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.5
 *
 * @return   {RURL}
 */
Element.setMethod(function getCurrentUrl() {
	return this.hawkejs_renderer?.helpers?.Router?.current_url;
});

/**
 * Get a resource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Object}     options
 * @param    {Object}     data
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Element.setMethod(function getResource(options, data, callback) {

	let renderer = this.hawkejs_renderer;

	if (!renderer && Blast.isBrowser) {
		renderer = hawkejs.scene.general_renderer;
	}

	if (renderer) {
		return renderer.helpers.Alchemy.getResource(options, data, callback);
	}

	throw new Error('Failed to find renderer instance, unable to get resource');
});

/**
 * Get a client-side model, attach a conduit if possible
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param    {string}   model_name
 * @param    {Object}   options
 *
 * @return   {Model}
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

/**
 * Default translation implementation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.4
 * @version  1.2.4
 *
 * @param    {string}   key
 * @param    {Object}   parameters
 *
 * @return   {string}
 */
Element.setMethod(function __(key, parameters) {
	return key;
});