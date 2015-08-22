/**
 * The global client-side alchemy object
 *
 * @type   {Object}
 */
window.alchemy = {};

(function() {

// Create the sceneid
hawkejs.scene.data();

alchemy.server = new __Protoblast.Classes.ClientSocket();

/**
 * Create a socket.io connection to the server
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.0.1
 * @version   1.0.0
 *
 * @param     {Function}   callback
 */
alchemy.connect = function connect(callback) {

	if (typeof window.io === 'undefined') {
		hawkejs.require(['socket.io.js', 'socket.io-stream'], function() {
			alchemy.server.connect(callback);
		});
	} else {
		alchemy.server.connect(callback);
	}
};

/**
 * Submit a message to the server
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.0.1
 * @version   0.0.1
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {Function} callback
 */
alchemy.submit = function submit(type, data, callback) {
	alchemy.server.submit(type, data, callback);
};

/**
 * Create a namespace and inform the server
 *
 * @author    Jelle De Loecker   <jelle@kipdola.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {String}   type    The typename of link to create
 * @param    {Object}   data    The initial data to submit
 *
 * @return   {Linkup}
 */
alchemy.linkup = function linkup(type, data) {
	return alchemy.server.linkup(type, data);
};

/**
 * Listen for server messages
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.0.1
 * @version   0.0.1
 *
 * @param    {String}   type
 * @param    {Function} callback
 */
alchemy.listen = alchemy.on = function listen(type, callback) {
	return alchemy.server.on(type, callback);
};

// Make the connection only if websockets are enabled
if (hawkejs.scene.exposed.enable_websockets) {
	alchemy.connect();
}

}());