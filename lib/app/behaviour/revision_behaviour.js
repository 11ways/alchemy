return
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
 * @version       0.0.1
 */
Behaviour.extend(function RevisionBehaviour (){

	/**
	 * The behaviour constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Model}     model    Model instance
	 * @param    {Object}    options  Bhaviour options
	 *
	 * @return   {undefined}
	 */
	this.init = function init(model, options) {

		// Call the parent init function
		this.parent('init');

		// Create a new model based on this revision
		this.RevisionModel = new Model({name: this.model.modelName + 'DataRevision'});
	};
	
	/**
	 * Called before the model saves a record,
	 * but after it has applied the strictFields
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 */
	this.beforeSave = function beforeSave(next, record, options) {

		var that = this;
		
		// If we're saving an existing record
		if (record._id) {

			// Find the original record
			Model.get(that.model.modelName).find('first', {conditions: {_id: record._id}}, function(err, result) {

				var ori;

				if (result.length) {

					// Get the original data
					ori = result[0][that.model.modelName];

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
		} else {
			next();
		}
	};

	/**
	 * Called after the model saves a record.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that has been saved
	 * @param    {Object}    errors
	 */
	this.afterSave = function afterSave(next, record, errors, options) {

		var that = this,
		    left,
		    right;

		// If we have original data to compare to
		if (options.__data_revision_before) {

			// Find the complete saved item
			Model.get(that.model.modelName).find('first', {conditions: {_id: record._id}}, function(err, result) {

				var newData, delta, revdata;

				if (result.length) {

					// Get the new data
					newData = result[0][that.model.modelName];

					if (newData) {

						// Convert the objects so they can be diffed properly
						left = alchemy.preDiff(options.__data_revision_before);
						right = alchemy.preDiff(newData);

						// Diff them
						delta = alchemy.postDiff(compare.diff(left, right));

						// Create a data object to store in the db
						revdata = {};

						// Add the delta information
						revdata[that.RevisionModel.modelName] = {
							record_id: options.__data_revision_before._id,
							delta: delta
						};

						// Save the data
						that.RevisionModel.save(revdata);
					}
				}

				next();
			});
		} else {
			next();
		}
	};

});