const fs = alchemy.use('fs');

/**
 * The File class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path   Path to the file
 */
var File = Function.inherits('Alchemy.Inode', function File(path) {
	File.super.call(this, path);
});

/**
 * Files are obviously files
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
File.setProperty('is_file', true);

/**
 * Read and return the contents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
File.setMethod(function read(options) {

	let pledge = new Pledge();

	if (!options) {
		options = {flag: 'r'};
	}

	fs.readFile(this.path, options, function done(err, data) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(data);
	});

	return pledge;
});

/**
 * Read and return the contents as a string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
File.setMethod(function readString(encoding) {

	if (!encoding) {
		encoding = 'utf8';
	}

	return this.read({encoding: encoding});
});