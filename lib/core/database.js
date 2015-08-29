var connections = alchemy.shared('Db.connections');

/**
 * Initialize datasource connections.
 * Should only be called once.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param   {Object}   datasources   An object containing datasource options
 */
alchemy.initDatasources = function initDatasources(datasources) {
	Object.each(datasources, function(source, name) {
		connections[name] = new alchemy.classes.Database(source, name);
	});

	// This is a lie, but it's not really that important that the connection
	// is already established
	alchemy.emit('datasourcesConnected');
};