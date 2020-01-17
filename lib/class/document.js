var Stream = alchemy.use('stream'),
    zlib   = alchemy.use('zlib'),
    fs     = alchemy.use('fs');

/**
 * The Document class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var Document = Function.inherits('Alchemy.Base', 'Alchemy.Document', function Document(record, options) {
	if (record || options) {
		this.setDataRecord(record, options);
	} else {
		this.$options = {};
	}
});

/**
 * Create document class for specific model
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.6
 *
 * @param    {Model|String}   model_param
 */
Document.setStatic(function getDocumentClass(model_param) {

	var doc_constructor,
	    document_name,
	    parent_path,
	    model_name,
	    namespace,
	    doc_path,
	    DocClass,
	    model,
	    alias;

	if (!model_param) {
		throw new Error('No model name was given, can not get Document class');
	}

	if (typeof model_param == 'function') {
		model = model_param;
	} else {
		model = Model.get(model_param, false);
	}

	if (!model) {
		throw new Error('There is no model named "' + model_param + '"');
	}

	// Unfortunately we need the model_name right now,
	// though sometimes it's set in the future.
	// This happens when we need to do a setDocumentMethod
	if (model.prototype.name) {
		model_name = model.prototype.name;
	} else {
		model_name = model.name;
	}

	// Make sure we got a model name
	if (!model_name) {
		throw new Error('Tried to get nameless document class');
	}

	// Get the namespace
	namespace = 'Alchemy.Document';

	// Get the name of the document class
	document_name = model.name;

	doc_path = namespace + '.' + document_name;

	// Get the document class
	DocClass = Object.path(Classes, doc_path);

	if (DocClass == null) {

		// Create the document constructor function
		doc_constructor = Function.create(document_name, function med(data, options) {
			med.wrapper.super.call(this, data, options);
		});

		if (!model.super || model.super.name == 'Model' || !model.super.Document) {
			parent_path = 'Alchemy.Document.Document';
		} else {
			parent_path = model.super.Document.prototype.path_to_class;
		}

		if (namespace) {
			DocClass = Function.inherits(parent_path, namespace, doc_constructor);
		} else {
			DocClass = Function.inherits(parent_path, doc_constructor);
		}

		// Set the getter for this document alias itself
		DocClass.setAliasGetter(model_name);

		// Set the model name
		DocClass.setProperty('$model_name', model_name);

		// Set the path to this document
		DocClass.setProperty('path_to_class', doc_path);

		// Set association getters
		for (alias in model.schema.associations) {
			DocClass.setAliasGetter(alias);
		}

		// Set a reference to the Model class
		DocClass.Model = model;
	}

	return DocClass;
});

/**
 * Get the client-side document class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   model_name
 */
Document.setStatic(function getClientDocumentClass(model_name) {

	if (!model_name) {
		model_name = this.prototype.$model_name;
	}

	return Classes.Alchemy.Client.Document.Document.getDocumentClass(model_name);
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {Object}           obj
 * @param    {Boolean|String}   cloned
 *
 * @return   {Document}
 */
Document.setStatic(function unDry(obj, cloned) {

	var DocClass,
	    result;

	// Get the document class
	DocClass = this.getDocumentClass(obj.$model_name);

	// Create a new instance, without constructing it yet
	result = Object.create(DocClass.prototype);

	// Restore the attributes object if there is one
	if (obj.$_attributes) {
		result.$_attributes = obj.$_attributes;
	}

	// Indicate it's a clone
	if (cloned) {
		result.$is_cloned = true;
	}

	DocClass.call(result, obj.$record, obj.$options);

	return result;
});

/**
 * Set the getter for this field
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.4
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

			if (this.$main[name] !== value) {
				this.markChangedField(name, value);
			}

			this.$main[name] = value;
		};
	} else {
		this.setProperty('hasCustomField', true);

		if (!this.$custom_fields) {
			this.setStatic('$custom_fields', {});
		}

		// Store the custom fields getter for JSON stuff
		this.$custom_fields[name] = name;
	}

	this.setProperty(name, getter, setter);
});

/**
 * Set the getter for an alias
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   name
 */
Document.setStatic(function setAliasGetter(name) {

	var descriptor;

	if (!name) {
		throw new Error('No name given to set on document class ' + JSON.stringify(this.name));
	}

	// Get the descriptor
	descriptor = Object.getOwnPropertyDescriptor(this.prototype, name);

	// Don't overwrite an already set property
	if (descriptor) {
		return;
	}

	this.setProperty(name, function getAliasObject() {
		return this.$record && this.$record[name];
	}, function setAliasObject(value) {
		this.$record[name] = value;
	});
});

/**
 * Is the given argument a Document?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Object}     obj
 *
 * @return   {Boolean}
 */
Document.setStatic(function isDocument(obj) {

	if (!obj || typeof obj != 'object') {
		return false;
	}

	// See if it's a server-side document
	if (obj instanceof Document) {
		return true;
	}

	if (Blast.Classes.Alchemy.Client.Document && Blast.Classes.Alchemy.Client.Document.Document) {
		return obj instanceof Blast.Classes.Alchemy.Client.Document.Document;
	}

	return false;
});

/**
 * Get the model instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Document.setProperty(function $model() {

	if (!this.$options.model) {
		this.$options.model = this.getModel(this.$model_name);
	}

	return this.$options.model;
});

/**
 * Get the conduit instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.3
 * @version  1.0.3
 */
Document.setProperty(function conduit() {
	if (this.$conduit) {
		return this.$conduit;
	}

	// If there already is a model instance in the options, return that
	// Do not use `this.$model` directly, because it used `this.conduit`, too
	if (this.$options.model) {
		return this.$options.model.conduit;
	}
}, function setConduit(conduit) {
	this.$conduit = conduit;
});

/**
 * Clone this document
 * @todo: more speed, custom properties, singularized?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Document.setMethod(function clone() {
	return this.dryClone();
});

/**
 * Clone this document for JSON-dry
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.7
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Document}
 */
Document.setMethod(function dryClone(wm, custom_method) {

	var options,
	    record,
	    result;

	// Clone the records using JSON-dry
	record = JSON.clone(this.$record, custom_method, wm);

	options = JSON.clone(this.getCleanOptions(), custom_method, wm);

	// Create a new document
	result = new this.constructor(record, options);

	// Copy over attributes
	result.$_attributes = JSON.clone(this.$_attributes, custom_method, wm);

	return result;
});

/**
 * Return an object for json-drying this document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @return   {Object}
 */
Document.setMethod(function toDry() {

	return {
		value: {
			$options    : this.getCleanOptions(),
			$record     : this.$record,
			$model_name : this.$model_name,
			$attributes : this.$_attributes,
			$hold       : this.$_hold,
		}
	};
});

/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
Document.setMethod(function toHawkejs(wm) {

	var DocClass = this.constructor.getClientDocumentClass(),
	    result = new DocClass(),
	    record;

	if (!wm) {
		wm = new WeakMap();
	}

	// Other values might reference this document too,
	// make sure it doesn't clone the same document twice
	wm.set(this, result);

	// Clone the record
	record = JSON.clone(this.$record, 'toHawkejs', wm);

	// Sometimes we get an EMPTY $record value,
	// this is probably because it's already in the process of being clones
	if (!Object.isEmpty(record)) {
		result.setDataRecord(record);
	} else {
		record.$record = record;
	}

	// Clone $hold values if they are available
	if (this.$_hold) {
		result.$_hold = JSON.clone(this.$_hold, 'toHawkejs', wm);
	}

	return result;
});

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Document.setMethod(function toJSON() {
	return this.$record;
});

/**
 * Return the array to util.inspect
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Document.setMethod(function inspect(depth) {
	return this.toJSON();
});

/**
 * Get a record field property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   alias   Optional alias
 * @param    {String}   field
 *
 * @return   {Mixed}
 */
Document.setMethod(function get(alias, field) {

	if (field == null) {
		field = alias;
		alias = this.$model_name;
	}

	if (this.$record && this.$record[alias]) {
		return this.$record[alias][field];
	}
});

/**
 * Set an alias object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   alias
 * @param    {Object}   obj
 *
 * @return   {Mixed}
 */
Document.setMethod(function setAlias(alias, obj) {

	this.$record[alias] = obj;

	// Make sure a getter is set for this alias
	if (!Object.getOwnPropertyDescriptor(this, alias)) {
		Object.defineProperty(this, alias, {
			get: function getManualAlias() {
				return this.$record[alias];
			}
		});
	}
});

/**
 * Alias for save
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 */
Document.setMethod(function update(data, callback) {
	this.save(data, callback);
});

/**
 * Remove this document
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.4.1
 * @version  1.1.0
 *
 * @param    {Function}  callback
 *
 * @return   {Pledge}
 */
Document.setMethod(function remove(callback) {

	if (!this.$pk) {
		let pledge = new Pledge();
		pledge.done(callback);
		return pledge.reject(new Error('No record to remove'));
	}

	return this.$model.remove(this.$pk, callback);
});

/**
 * Add associated data to this record
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Criteria} criteria
 * @param    {Function} callback
 *
 * @return   {Pledge}
 */
Document.setMethod(['populate', 'addAssociatedData'], function addAssociatedData(criteria, callback) {

	var that  = this,
	    model = this.$model,
	    type  = typeof criteria,
	    selects;

	if (type == 'string') {
		selects = [criteria];
		criteria = {};
	} else if (type == 'function') {
		callback = criteria;
		criteria = {};
	} else if (Array.isArray(criteria)) {
		selects = criteria;
		criteria = {};
	} else if (!criteria) {
		criteria = {};
	}

	if (!Classes.Alchemy.Criteria.Criteria.isCriteria(criteria)) {
		let new_criteria = new Classes.Alchemy.Criteria();
		new_criteria.model = model;
		new_criteria.applyOldConditions(criteria);
		criteria = new_criteria;
	}

	criteria.setOption('recursive', 1);
	criteria.setOption('associations', model.schema.associations);

	if (selects) {
		let i;

		for (i = 0; i < selects.length; i++) {
			criteria.select(selects[i]);
		}
	}

	return model.addAssociatedDataToRecord(criteria, this.$record, callback);
});

/**
 * Get the display field value
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Document.setMethod(function getDisplayFieldValue(options) {

	var display_field,
	    result,
	    i;

	if (!options) {
		options = {};
	}

	display_field = Array.cast(this.$model.displayField);

	// If there are fields we prefer, check those first
	if (options.prefer) {
		display_field = Array.cast(options.prefer).concat(display_field);
	}

	for (i = 0; i < display_field.length; i++) {
		result = this[display_field[i]];

		if (result) {
			result = alchemy.pickTranslation(undefined, result).result;

			if (result) {
				return result;
			}
		}
	}

	// If nothing was found, return the _id value
	return String(this._id);
});

/**
 * Revert this document
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.3
 * @version  1.1.0
 *
 * @param    {Number}   revisions
 *
 * @return   {Pledge}
 */
Document.setMethod(function revert(revisions) {

	var revision_behaviour = this.$model.getBehaviour('revision');

	if (!revision_behaviour) {
		return Pledge.reject(new Error('The model of this document has no revision behaviour'));
	}

	let that = this,
	    target_revision,
	    revision_model = revision_behaviour.revision_model,
	    pledge;

	if (!revisions) {
		revisions = 1;
	}

	// Get the wanted revision
	target_revision = this.__r - revisions;

	pledge = Function.series(async function getDeltas(next) {

		var criteria,
		    records,
		    record,
		    i;

		criteria = new Blast.Classes.Alchemy.Criteria();
		criteria.where('record_id', that._id);
		criteria.where('revision').gt(target_revision).lte(that.__r);
		criteria.sort({revision: -1});

		records = await revision_model.find('all', criteria);

		for (i = 0; i < records.length; i++) {
			record = records[i];
			revision_behaviour.diff_patcher.unpatch(that.$main, record.delta);
		}

		next();

	}, function done(err, result) {

	});

	return pledge;
});

/**
 * Export this document by pushing to the writable stream
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   output
 *
 * @return   {Pledge}
 */
Document.setMethod(function exportToStream(output) {

	var that = this,
	    pledge = new Pledge(),
	    data;

	// Stringify the data
	data = JSON.dry(this.$main);

	zlib.gzip(data, function zipped(err, buffer) {

		if (err) {
			return pledge.reject(err);
		}

		let hbuf = Buffer.alloc(5);

		// 0x02 is a document
		hbuf.writeUInt8(0x02, 0);

		// Write the length of the actual data buffer
		hbuf.writeUInt32BE(buffer.length, 1);

		// Push this header on the stream
		output.write(hbuf);

		// And now write the data buffer
		output.write(buffer, function written() {

			if (typeof that.extraExportToStream == 'function') {
				let sub_pledge = that.extraExportToStream(output);

				if (sub_pledge) {
					sub_pledge.done(function done(err) {
						if (err) {
							pledge.reject(err);
						} else {
							pledge.resolve();
						}
					});
				} else {
					pledge.resolve();
				}
			} else {
				pledge.resolve();
			}
		});
	});

	return pledge;
});

/**
 * Import a document from a gzipped buffer
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Buffer}   buffer
 *
 * @return   {Pledge}
 */
Document.setMethod(function importFromBuffer(buffer) {

	var that = this,
	    pledge = new Pledge();

	zlib.gunzip(buffer, async function unzipped(err, data) {

		if (err) {
			return pledge.reject(err);
		}

		data = JSON.undry(data.toString());

		that.$main = data;

		await that.save(null, {
			validate         : false,
			override_created : true,
			set_updated      : false,
			importing        : true
		});

		pledge.resolve();
	});

	return pledge;
});