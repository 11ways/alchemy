module.exports = function publicModel(Hawkejs, Blast) {

	var model_info;

	if (Blast.isBrowser) {
		Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {

			var ModelClass,
			    model_name,
			    config,
			    key;

			model_info = view.exposeToScene.model_info;

			for (model_name in model_info) {
				config = model_info[model_name];
				ModelClass = Model.getClass(model_name);
			}
		});
	}

	/**
	 * The Model class
	 * (on the client side)
	 *
	 * @constructor
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   options
	 */
	var Model = Function.inherits('Alchemy.Base', 'Hawkejs', function Model(options) {
		this.options = options || {};
	});

	/**
	 * Get the document class constructor
	 *
	 * @type   {Hawkejs.Document}
	 */
	Model.prepareStaticProperty('Document', function getDocumentClass() {
		return Blast.Classes.Hawkejs.Document.getDocumentClass(this);
	});

	/**
	 * Create client model class for specific model name
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   model_name
	 */
	Model.setStatic(function getClass(model_name) {

		var model_constructor,
		    parent_path,
		    class_name,
		    class_path,
		    ModelClass,
		    config,
		    key;

		// Construct the name of the class
		class_name = model_name + 'Model';

		// Construct the path to this class
		class_path = class_name;

		// Get the class
		ModelClass = Object.path(Blast.Classes.Hawkejs, class_path);

		if (ModelClass == null) {
			model_constructor = Function.create(class_name, function med(record, options) {
				med.wrapper.super.call(this, record, options);
			});

			// @TODO: inherit from parents
			parent_path = 'Hawkejs.Model';

			ModelClass = Function.inherits(parent_path, model_constructor);

			ModelClass.setProperty('model_name', model_name);
		}

		return ModelClass;
	});

	/**
	 * Set a method on the hawkejs document class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Model.setStatic(function setDocumentMethod(name, fnc, on_server) {

		if (typeof name == 'function') {
			on_server = fnc;
			fnc = name;
			name = fnc.name;
		}

		return this.Document.setMethod(name, fnc, on_server);
	});

	/**
	 * Set a property on the hawkejs document class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Model.setStatic(function setDocumentProperty(key, getter, setter, on_server) {
		return this.Document.setProperty.apply(this.Document, arguments);
	});

};