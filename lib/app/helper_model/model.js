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
	var Model = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Model', function Model(options) {

		var that = this;

		this.options = options || {};

		// Only create the client side db when a model is created
		if (!this.datasource) {
			this.constructor.createClientCache();
		}

		if (this.datasource.hasBeenSeen('has_records_store')) {
			this.emit('ready');
		} else {
			this.datasource.once('has_records_store', function makeReady() {
				that.emit('ready');
			});
		}
	});

	/**
	 * The datasource
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Model.setProperty(function datasource() {
		return this.constructor._client_cache;
	});

	/**
	 * Get the document class constructor
	 *
	 * @type   {Hawkejs.Document}
	 */
	Model.prepareStaticProperty('Document', function getDocumentClass() {
		return Blast.Classes.Alchemy.Client.Document.Document.getDocumentClass(this);
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
		class_name = model_name;

		// Construct the path to this class
		class_path = 'Alchemy.Client.Model.' + class_name;

		// Get the class
		ModelClass = Object.path(Blast.Classes, class_path);

		if (ModelClass == null) {
			model_constructor = Function.create(class_name, function med(record, options) {
				med.wrapper.super.call(this, record, options);
			});

			// @TODO: inherit from parents
			parent_path = 'Alchemy.Client.Model';

			ModelClass = Function.inherits(parent_path, model_constructor);

			ModelClass.setProperty('$model_name', model_name);
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

	/**
	 * Create the client-side cache
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Model.setStatic(function createClientCache() {

		var model_name,
		    db;

		if (!Blast.isBrowser || this._client_cache) {
			return;
		}

		model_name = this.prototype.$model_name;

		db = new Blast.Classes.Alchemy.IndexedDb(model_name);

		// See if the records store exists or not
		db.hasStore('records', function hasStore(err, has_store) {

			if (err) {
				throw err;
			}

			if (has_store) {
				db.emit('has_records_store');
				return;
			}

			db.modifyObjectStore('records', function gotStore(err, store) {

				if (err) {
					throw err;
				}

				db.emit('has_records_store');
			});
		});

		console.log('Created client cache for', this.name, db);

		this._client_cache = db;
	});

	/**
	 * Insert record on the client side
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Model.setAfterMethod('ready', function _create(object, callback) {

		if (!object._id) {
			object._id = Blast.createObjectId();
		}

		this.datasource.create('records', object, callback);
	});

	// Make this class easily available
	Hawkejs.Model = Model;

};