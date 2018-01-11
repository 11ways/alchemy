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
	var Model = Function.inherits('Hawkejs', function Model(options) {
		this.options = options || {};
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
		ModelClass = Object.path(Blast.Classes.Hawkejs, doc_path);

		if (ModelClass == null) {
			model_constructor = Function.create(class_name, function med(record, options) {
				med.wrapper.super.call(this, record, options);
			});

			// @TODO: inherit from parents
			parent_path = 'Hawkejs.Document';

			ModelClass = Function.inherits(parent_path, model_constructor);

			ModelClass.setProperty('model_name', model_name);
		}

		return ModelClass;
	});
};