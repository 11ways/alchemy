module.exports = function publicDocument(Hawkejs, Blast) {

	var model_info;

	console.log('Creating Document class')
	console.log(Hawkejs, Blast);

	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {
		console.log('Hawkejs has been made:', hawkejs);
		console.log('Variables:', variables)
		console.log('Settings:', settings);
		console.log('View:', view);
	});

	if (Blast.isNode) {
		let models = Model.getAllChildren(),
		    i;

		model_info = {};

		for (i = 0; i < models.length; i++) {
			model_info[models[i].prototype.modelName] = models[i].getClientConfig();
		}
	}

	/**
	 * The Document class
	 * (on the client side)
	 *
	 * @constructor
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   record   A record containing the main & related data
	 * @param    {Object}   options
	 */
	var Document = Function.inherits('Array', 'Hawkejs', function Document(record, options) {

		var item,
		    i;

		if (!record) {
			record = {};
			record[this.modelName] = {};
		}

		this.$options = options || {};

		// The original record
		this.$record = record;

		// The main data
		this.$main = record[this.modelName];

		// Initialize the document
		if (this.init) this.init();
	});

	/**
	 * Set a getter for this field
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     name     Name of the property
	 * @param    {Function}   getter   Optional getter function
	 * @param    {Function}   setter   Optional setter function
	 */
	Document.setStatic(function setFieldGetter(name, getter, setter) {

		if (typeof getter != 'function') {
			getter = function getFieldValue() {
				return this.$main[name];
			};

			setter = function setFieldValue(value) {
				this.$main[name] = value;
			};
		}

		this.setProperty(name, getter, setter);
	});

	/**
	 * Create document class for specific model
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   model_name
	 */
	Document.setStatic(function getDocumentClass(model_name) {

		var doc_constructor,
		    document_name,
		    parent_path,
		    DocClass,
		    doc_path,
		    config,
		    key;

		// Construct the name of the document class
		document_name = model_name + 'Document';

		// Construct the path to this class
		doc_path = document_name;

		// Get the class
		DocClass = Object.path(Classes.Hawkejs, doc_path);

		if (DocClass == null) {
			doc_constructor = Function.create(document_name, function med(record, options) {
				med.wrapper.super.call(this, record, options);
			});

			// @TODO: inherit from parents
			parent_path = 'Hawkejs.Document';

			DocClass = Function.inherits(parent_path, doc_constructor);

			DocClass.setProperty('modelName', model_name);

			if (Blast.isNode) {
				config = Classes.Alchemy[model_name + 'Model'].getClientConfig();

				for (key in config.fields) {
					DocClass.setFieldGetter(key);
				}
			}

			console.log('DocClass:', DocClass);
		}

		return DocClass;
	});



};