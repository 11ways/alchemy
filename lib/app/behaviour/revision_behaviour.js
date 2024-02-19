var jsondiffpatch = alchemy.use('jsondiffpatch'),
    revision_before = new WeakMap(),
    diff_patch_instance;

/**
 * The Revision Behaviour class
 *
 * @constructor
 * @extends       Alchemy.Behaviour
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.2.0
 */
const Revision = Function.inherits('Alchemy.Behaviour', 'RevisionBehaviour');

/**
 * Get the Revision model class for the given main model
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Schema}    schema
 * @param    {Object}    options
 */
Revision.setStatic(function getRevisionModel(model) {

	if (typeof model == 'function') {
		model = model.model_name;
	}

	if (typeof model == 'string') {
		model = Model.get(model);
	}

	if (!model) {
		throw new Error('Unable to add Revision behaviour to undefined model');
	}

	let revision_model_name = model.model_name + 'DataRevision',
	    revision_model;

	try {
		revision_model = Model.get(revision_model_name, false);
	} catch (err) {
		// Ignore
	}

	if (revision_model) {
		return revision_model;
	}
	
	let namespace = model.constructor.namespace,
	    class_name = model.name + 'DataRevision';

	let model_class = Function.inherits('Alchemy.Model', namespace, Function.create(class_name, function DataRevision(options) {
		Model.call(this, options);
	}));

	model_class.constitute(function addRevisionFields() {

		// These documents should never be updated,
		// so we can remove this automatically added field
		this.schema.remove('updated');

		this.addField('record_id', 'ObjectId');
		this.addField('revision', 'Number');
		this.addField('delta', 'Object');

		if (Classes.Alchemy.Model.User) {
			this.belongsTo('User');
		}

		// Add an index on the record_id
		this.addIndex('record_id', {
			unique : false,
			sparse : false,
		});
	});

	// Force the constitutors to load now
	Function.doConstitutors(model_class);

	return model_class;
});

/**
 * Listen to attachments to schema's
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.4.0
 *
 * @param    {Schema}    schema
 * @param    {Object}    options
 */
Revision.setStatic(function attached(schema, new_options) {

	const context = schema.model_class;

	// Add the revision number to the main model
	context.addField('__r', 'Number', {
		title: 'Revision',
	});

	Revision.getRevisionModel(schema.model_class);
});

/**
 * Get the Revision Model class for the attached model
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.4.0
 */
Revision.setProperty(function revision_model_class() {
	return Revision.getRevisionModel(this.model);
});

/**
 * Get the revision model for the attached model
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.0.3
 */
Revision.setProperty(function revision_model() {

	if (!this._revision_model) {
		let model_class = this.revision_model_class;
		this._revision_model = new model_class();
	}

	return this._revision_model;
});

/**
 * Get the jsondiffpatch instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.0.3
 */
Revision.setProperty(function diff_patcher() {

	if (diff_patch_instance) {
		return diff_patch_instance;
	}

	// Create the diff comparer
	diff_patch_instance = jsondiffpatch.create({
		// Compare objects by a checksum
		objectHash: function objectHash(obj) {
			return Object.checksum(obj, false);
		}
	});

	// This filter will compare JSON-DRY objects,
	// if left & right is different, it should assume the object in total should be added to the diff
	diff_patch_instance.processor.pipes.diff.before('trivial', function dryObjectFilter(context) {

		var left = context.left,
		    right = context.right;

		if (!left || typeof left != 'object') {
			return;
		}

		if (!right || typeof right != 'object') {
			return;
		}

		if (!left.dry && !right.dry) {
			return;
		}

		if (Object.checksum(left, false) != Object.checksum(right, false)) {
			context.setResult([left, right]);
			context.exit();
		}
	});

	return diff_patch_instance;
});

/**
 * Compare 2 objects
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.3
 */
Revision.setMethod(function compare(left, right) {
	return this.diff_patcher.diff(left, right);
});

/**
 * Called before the model saves a record,
 * but after it has applied the strictFields
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 */
Revision.setMethod(function beforeSave(record, options, creating) {

	let main = record.$main;

	if (!main) {
		throw new Error('Unable to find main "' + this.model.model_name + '" data');
	}

	// No revision to save when creating a record
	if (creating) {
		main.__r = 0;
		return;
	}

	let that = this,
	    next = this.wait('series');

	// Find the original record
	Model.get(this.model.model_name).findById(record.$pk, async function gotRecord(err, result) {

		if (result) {

			// Get the original data
			let ori = await that.model.convertRecordToDatasourceFormat(result);

			// Store the original data in a weakmap for later
			revision_before.set(options, ori);

			// Increase the revision count by 1
			if (ori.__r) {
				main.__r = ori.__r+1;
			} else {
				main.__r = 1;
			}
		}

		next();
	});
});

/**
 * Called after the model saves a record.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 */
Revision.setMethod(function afterSave(record, options, created) {

	let earlier_data;

	if (created) {
		earlier_data = {};
	} else {
		earlier_data = revision_before.get(options);
	}

	// Do we have earlier data to compare to?
	if (!earlier_data) {
		return;
	}

	let doc = this.model.createDocument(record);
	let next = this.wait();
	const that = this;

	// Find the complete saved item
	Model.get(this.model.model_name).findByPk(doc.$pk, async function gotRecord(err, result) {

		if (result) {

			// Get the new data
			let new_data = await that.model.convertRecordToDatasourceFormat(result);

			if (new_data) {

				// Convert the objects so they can be diffed properly
				let left = JSON.toDryObject(earlier_data),
				    right = JSON.toDryObject(new_data);

				// Diff them
				let delta = that.compare(left, right);
				delta = JSON.undry(delta);

				// Create a data object to store in the db
				let revision_data = {
					record_id              : earlier_data._id || new_data._id,
					revision               : new_data.__r,
					delta                  : delta
				};

				if (Classes.Alchemy.Model.User && that.model.conduit) {
					let user_data = that.model.conduit.session('UserData');

					if (user_data) {
						revision_data.user_id = user_data.$pk;
					}
				}

				// Add the delta information
				revision_data = {
					[that.revision_model.model_name] : revision_data
				};

				// Save the data
				that.revision_model.save(revision_data, {allowFields: true});
			}
		}

		next();
	});
});