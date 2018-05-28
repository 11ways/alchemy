// This is only meant for the client
if (Blast.isNode) {
	return;
}

/**
 * The ClientCollection class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
var ClientCollection = Blast.Bound.Function.inherits('Alchemy.Base', function ClientCollection(name) {

	// The collection name
	this.name = name;

	// Make sure the database and such exist
	this.init();
});

/**
 * Initialize the connection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ClientCollection.setMethod(function init(version) {

	var that = this;

	// Create a connection
	this.connection = new Blast.Classes.Alchemy.ClientDb(this.name);

	// Make sure the store is available
	this.connection.hasStore('records', function hasRecords(err, result) {

		if (err) {
			return that.emit('error', err);
		}

		if (result) {
			return that.emit('ready');
		}

		that.connection.modifyObjectStore('records', function gotRecordsStore(err, store) {

			if (err) {
				return that.emit('error', err);
			}

			that.emit('ready');
		});
	});
});