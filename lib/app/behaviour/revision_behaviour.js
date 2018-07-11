var jsondiffpatch = alchemy.use('jsondiffpatch'),
    revision_before = new WeakMap(),
    diff_patch_instance;

/**
 * The Revision Behaviour class
 *
 * @constructor
 * @extends       Alchemy.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.2.0
 */
var Revision = Function.inherits('Alchemy.Behaviour', function RevisionBehaviour(model, options) {
	Behaviour.call(this, model, options);
});

/**
 * Get the Revision Model class for the attached model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 */
Revision.setProperty(function revision_model_class() {

	var class_name = this.model.name + 'DataRevision';

	if (Classes.Alchemy.Model[class_name]) {
		return Classes.Alchemy.Model[class_name];
	}

	let model_class = Function.inherits('Alchemy.Model', Function.create(class_name, function DataRevision(options) {
		Model.call(this, options);
	}));

	model_class.constitute(function addFields() {
		this.addField('record_id', 'ObjectID');
		this.addField('revision', 'Number');
		this.addField('delta', 'Object');
	});

	// Force the constitutors to load now
	Function.doConstitutors(model_class);

	return model_class;
});

/**
 * Get the revision model for the attached model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 */
Revision.setProperty(function diff_patcher() {

	if (diff_patch_instance) {
		return diff_patch_instance;
	}

	// Create the diff comparer
	diff_patch_instance = jsondiffpatch.create({
		// Compare ObjectIds by their string value
		objectHash: function objectHash(obj) {

			if (String(obj).isObjectId()) {
				return String(obj);
			}

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
 * Listen to attachments to schema's
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Schema}    schema
 * @param    {Object}    options
 */
Revision.setStatic(function attached(schema, new_options) {

	var context = schema.modelClass;

	// Add the revision
	context.addField('__r', 'Number', {title: 'Revision'});
});

/**
 * Compare 2 objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.3
 */
Revision.setMethod(function beforeSave(record, options, creating) {

	let main = record[this.model.name];

	// No revision to save when creating a record
	if (creating) {
		main.__r = 0;
		return;
	}

	let that = this,
	    next = this.wait('series');

	// Find the original record
	Model.get(that.model.name).findById(main._id, async function gotRecord(err, result) {

		var ori;

		if (result) {

			// Get the original data
			ori = await that.model.convertRecordToDatasourceFormat(result);

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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.3
 */
Revision.setMethod(function afterSave(record, options, created) {

	var that = this,
	    earlier_data,
	    right,
	    main,
	    that,
	    left,
	    next;

	if (created) {
		earlier_data = {};
	} else {
		earlier_data = revision_before.get(options);
	}

	// Do we have earlier data to compare to?
	if (!earlier_data) {
		return;
	}

	next = this.wait();
	main = record[that.model.name] || record;

	// Find the complete saved item
	Model.get(that.model.name).findById(main._id, async function gotRecord(err, result) {

		var revision_data,
		    new_data,
		    delta;

		if (result) {

			// Get the new data
			new_data = await that.model.convertRecordToDatasourceFormat(result);

			if (new_data) {

				// Convert the objects so they can be diffed properly
				left = JSON.toDryObject(earlier_data);
				right = JSON.toDryObject(new_data);

				// Diff them
				delta = that.compare(left, right);
				delta = JSON.undry(delta);

				// Create a data object to store in the db
				revision_data = {};

				// Add the delta information
				revision_data[that.revision_model.name] = {
					record_id : earlier_data._id || new_data._id,
					revision  : new_data.__r,
					delta     : delta
				};

				// Save the data
				that.revision_model.save(revision_data, {allowFields: true});
			}
		}

		next();
	});
});