var jsondiffpatch = alchemy.use('jsondiffpatch'),
    compare;

// Create the diff comparer
compare = jsondiffpatch.create({
	// Compare ObjectIds by their string value
	objectHash: function objectHash(obj) {

		if (String(obj).isObjectId()) {
			return String(obj);
		}

		return obj;
	}
});

/**
 * The Revision Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@codedor.be>
 * @since         0.0.1
 * @version       1.0.0
 */
var Revision = Function.inherits('Behaviour', function RevisionBehaviour(model, options) {

	Behaviour.call(this, model, options);

	// Create a new model based on this revision
	this.RevisionModel = new Model({name: this.model.name + 'DataRevision'});
});


/**
 * Called before the model saves a record,
 * but after it has applied the strictFields
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Revision.setMethod(function beforeSave(record, options, creating) {

	var that,
	    next;

	// If we're saving an existing record
	if (!creating) {

		that = this;
		next = this.wait('series');

		// Find the original record
		Model.get(that.model.name).find('first', {conditions: {_id: record._id}}, function(err, result) {

			var ori;

			if (result.length) {

				// Get the original data
				ori = result[0][that.model.name];

				// Store the original data in the options object
				options.__data_revision_before = ori;

				// Increase the revision count by 1
				if (ori.__r) {
					record.__r = ori.__r+1;
				} else {
					record.__r = 1;
				}
			}

			next();
		});
	}
});

/**
 * Called after the model saves a record.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Revision.setMethod(function afterSave(record, options, created) {

	var right,
	    that,
	    left,
	    next;

	// If we have original data to compare to
	if (options.__data_revision_before) {

		that = this;
		next = this.wait();

		// Find the complete saved item
		Model.get(that.model.name).find('first', {conditions: {_id: record._id}}, function(err, result) {

			var newData, delta, revdata;

			if (result.length) {

				// Get the new data
				newData = result[0][that.model.name];

				if (newData) {

					// Convert the objects so they can be diffed properly
					left = alchemy.preDiff(options.__data_revision_before);
					right = alchemy.preDiff(newData);

					// Diff them
					delta = alchemy.postDiff(compare.diff(left, right));

					// Create a data object to store in the db
					revdata = {};

					// Add the delta information
					revdata[that.RevisionModel.name] = {
						record_id: options.__data_revision_before._id,
						delta: delta
					};

					// Save the data
					that.RevisionModel.save(revdata, {allowFields: true});
				}
			}

			next();
		});
	}
});