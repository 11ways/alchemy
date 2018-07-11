var jsondiffpatch = alchemy.use('jsondiffpatch'),
    revision_before = new WeakMap(),
    compare_fnc;

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
	// Add the revision
	schema.addField('__r', 'Number');
});

/**
 * Compare 2 objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.3gerlkmgrtlkmgtrklmgektrlmgketlrmgktelmrgkletm
 */
Revision.setMethod(function compare(left, right) {

	// Create the diff comparer
	if (!compare_fnc) {
		compare_fnc = jsondiffpatch.create({
			// Compare ObjectIds by their string value
			objectHash: function objectHash(obj) {

				if (String(obj).isObjectId()) {
					return String(obj);
				}

				return Object.checksum(obj, false);
			}
		});
	}

	return compare_fnc.diff(left, right);
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

	// No revision to save when creating a record
	if (creating) {
		return;
	}

	let that = this,
	    next = this.wait('series'),
	    main = record[that.model.name];

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

	earlier_data = revision_before.get(options);

	// Do we have earlier data to compare to?
	if (!earlier_data) {
		return;
	}

	next = this.wait();
	main = record[that.model.name] || record;

	// Find the complete saved item
	Model.get(that.model.name).findById(main._id, async function gotRecord(err, result) {

		var newData,
		    delta,
		    revdata;

		if (result) {

			// Get the new data
			newData = await that.model.convertRecordToDatasourceFormat(result);

			if (newData) {

				// Convert the objects so they can be diffed properly
				left = JSON.toDryObject(earlier_data);
				right = JSON.toDryObject(newData);

				// Diff them
				delta = JSON.undry(that.compare(left, right));

				// Create a data object to store in the db
				revdata = {};

				// Add the delta information
				revdata[that.revision_model.name] = {
					record_id : earlier_data._id,
					delta     : delta
				};

				// Save the data
				that.revision_model.save(revdata, {allowFields: true});
			}
		}

		next();
	});
});