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

	if (typeof path == 'object') {
		return File.from(path);
	}

	this.type = null;
	this.hash = null;

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
 * Create a File instance from the given variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.0
 */
File.setStatic(function from(obj) {

	let path;

	if (typeof obj == 'string') {
		path = obj;
		obj = null;
	} else {
		path = obj.path;
	}

	let file = new File(path);

	if (obj) {
		file.stat = {
			size : obj.size
		};

		file.name = obj.name;
		file.type = obj.type;
		file.hash = obj.hash;
	}

	return file;
});

/**
 * Read and return the contents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.8
 */
File.setMethod(function read(options) {

	let pledge = new Pledge();

	if (!options) {
		options = {flag: 'r'};
	} else if (!options.flag) {
		options.flag = 'r';
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
 * @since    1.1.0
 * @version  1.1.0
 */
File.setMethod(function readString(encoding) {

	if (!encoding) {
		encoding = 'utf8';
	}

	return this.read({encoding: encoding});
});