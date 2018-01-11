module.exports = function publicDocument(Hawkejs, Blast) {

	var model_info;

	if (Blast.isBrowser) {
		Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {

			var model_name,
			    DocClass,
			    config,
			    key;

			model_info = view.exposeToScene.model_info;

			for (model_name in model_info) {
				config = model_info[model_name];
				DocClass = Document.getDocumentClass(model_name);

				for (key in config.fields) {
					DocClass.setFieldGetter(key);
				}
			}
		});
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
			record[this.$model_name] = {};
		}

		this.$options = options || {};

		// The original record
		this.$record = record;

		// The main data
		this.$main = record[this.$model_name];

		// Initialize the document
		if (this.init) this.init();
	});

	/**
	 * Set a property
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     key        Name of the property
	 * @param    {Function}   getter     Optional getter function
	 * @param    {Function}   setter     Optional setter function
	 * @param    {Boolean}    on_server  Also set on the server implementation
	 */
	Document.setStatic(function setProperty(key, getter, setter, on_server) {

		if (Blast.isNode && on_server !== false) {
			console.log('Setting', key.name, 'on main of', this, this.prototype);
			console.log('Getting DocClass...')

			var DocClass = Classes.Alchemy.Document.getDocumentClass(this.prototype.$model_name);
			console.log('Got it?', !!DocClass)

			if (!DocClass) {
				console.log('DocClass for', this, 'not found');
			} else if (!DocClass.prototype.hasOwnProperty(key)) {
				// Only add it to the server's Document if it doesn't have this property
				Blast.Collection.Function.setProperty(DocClass, key, getter, setter);
			}
		}

		return Blast.Collection.Function.setProperty(this, key, getter, setter);
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
	 * @param    {Boolean}    on_server  Also set on the server implementation
	 */
	Document.setStatic(function setFieldGetter(name, getter, setter, on_server) {

		if (typeof getter != 'function') {
			getter = function getFieldValue() {
				return this.$main[name];
			};

			setter = function setFieldValue(value) {
				this.$main[name] = value;
			};
		}

		this.setProperty(name, getter, setter, on_server);
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
		DocClass = Object.path(Blast.Classes.Hawkejs, doc_path);

		if (DocClass == null) {
			doc_constructor = Function.create(document_name, function med(record, options) {
				med.wrapper.super.call(this, record, options);
			});

			// @TODO: inherit from parents
			parent_path = 'Hawkejs.Document';

			DocClass = Function.inherits(parent_path, doc_constructor);

			DocClass.setProperty('$model_name', model_name, null, false);
		}

		return DocClass;
	});

	/**
	 * unDry an object
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Hawkejs.publicDocumentt}
	 */
	Document.setStatic(function unDry(obj) {

		var DocClass,
		    result;

		DocClass = this.getDocumentClass(obj.$model_name);

		// Create a new I18n instance (without calling the constructor)
		result = new DocClass(obj.$record, obj.$options);

		return result;
	});

	/**
	 * Return an object for json-drying this document
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Object}
	 */
	Document.setMethod(function toDry() {
		return {
			value: {
				$options    : this.$options,
				$record     : this.$record,
				$model_name : this.$model_name
			},
			namespace : 'Hawkejs',
			dry_class : 'Document'
		};
	});

};