const HASH = Symbol('hash'),
      ALGORITHM = Symbol('algorithm');

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
 * @version  1.2.7
 */
File.setStatic(function from(obj) {

	if (!obj) {
		return;
	}

	let path,
	    name,
	    type,
	    hash,
		size;

	if (typeof obj == 'string') {
		path = obj;
	} else if (obj.originalFilename) {
		// Formidable 2.0
		path = obj.filepath;
		name = obj.originalFilename;
		type = obj.mimetype;
		hash = obj.hash;
		size = obj.size;
	} else {
		path = obj.path;
		name = obj.name;
		type = obj.type;
		hash = obj.hash;
		size = obj.size;
	}

	let file = new File(path);

	if (size != null) {
		file.stat = {size};
	}

	if (name != null) {
		file.name = name;
	}

	if (type != null) {
		file.type = type;
	}

	if (hash != null) {
		file.hash = hash;
	}

	return file;
});

/**
 * Get the mimetype of the file
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {String|Pledge<String>}
 */
File.setMethod(function getMimetype() {

	if (!this.type) {
		const pledge = new Pledge();
		this.type = pledge;

		alchemy.getMimetype(this.path, (err, result) => {

			this.type = result;

			if (err) {
				pledge.reject(err);
			} else {
				pledge.resolve(result);
			}
		});
	}

	return this.type;
});

/**
 * Get the SHA1 hash of the file
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}   algorithm
 *
 * @return   {String|Pledge<String>}
 */
File.setMethod(function getHash(algorithm) {

	algorithm = algorithm || alchemy.settings.file_hash_algorithm;

	if (!this[HASH] || this[ALGORITHM] != algorithm) {
		const options = {algorithm};
		this[HASH] = alchemy.hashFile(this.path, options);
		this[ALGORITHM] = algorithm;

		this[HASH].done((err, result) => {
			this[HASH] = result;
		});
	}

	return this[HASH];
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