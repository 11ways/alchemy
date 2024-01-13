const HASH = Symbol('hash'),
      ALGORITHM = Symbol('algorithm'),
      LIBMAGIC = alchemy.use('@picturae/mmmagic'),
      LIBMIME = alchemy.use('mime'),
      fs = alchemy.use('fs');

let Magic;

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

	this.possible_type = null;
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
 * Detect the filetype of the given path
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}   path
 *
 * @return   {Pledge<String>}
 */
File.setStatic(function getMimetype(path) {

	let pledge = new Pledge();

	if (!Magic && LIBMAGIC) {
		Magic = new LIBMAGIC.Magic(LIBMAGIC.MAGIC_MIME_TYPE);
	}

	if (Magic) {
		Magic.detectFile(path, (err, result) => {

			if (err || result == 'application/octet-stream' || result == 'text/plain') {
				result = File.guessMimetypeFromPath(path, result);
			}

			if (result == 'application/javascript') {
				result = 'text/javascript';
			} else if (result == 'image/svg') {
				result = 'image/svg+xml';
			}

			pledge.resolve(result);
		});
	}

	return pledge;
});

/**
 * Guess the mimetype from the path
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}   path
 * @param    {String}   fallback
 *
 * @return   {String}
 */
File.setStatic(function guessMimetypeFromPath(path, fallback) {

	let result = fallback;

	if (LIBMIME) {
		result = LIBMIME.getType(path);

		if (fallback && result != fallback) {
			if (result == 'application/octet-stream' || result == 'text/plain') {
				result = fallback;
			}
		}
	}

	return result;
});

/**
 * Create a File instance from the given variable
 * (From an untrusted source)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 */
File.setStatic(function fromUntrusted(obj) {

	if (!obj) {
		return;
	}

	if (typeof obj == 'string') {
		return File.from(obj);
	}

	let path,
	    name,
	    type,
	    hash,
	    size;

	if (obj.originalFilename) {
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

	obj = {
		path,
		name,
		hash,
		size,
		possible_type : type,
	};

	return File.from(obj);
});

/**
 * Create a File instance from the given variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.0
 */
File.setStatic(function from(obj) {

	if (!obj) {
		return;
	}

	let possible_type,
	    path,
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
		possible_type = obj.possible_type;
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

	if (possible_type) {
		file.possible_type = possible_type;
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

		File.getMimetype(this.path).done((err, result) => {

			if (err || !result) {
				result = this.possible_type;
			}

			this.type = result;
			pledge.resolve(result);
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

	algorithm = algorithm || alchemy.settings.data_management.file_hash_algorithm;

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
 * Create a read stream
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Object}   options   Options passed to the `fs.createReadStream` method
 */
File.setMethod(function createReadStream(options) {
	return fs.createReadStream(this.path, options);
});

/**
 * Read and return the contents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.16
 */
File.setMethod(function read(options) {

	let pledge = new Pledge();

	if (typeof options == 'string') {
		options = {encoding: options};
	}

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

/**
 * Write the given data to the file
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.22
 * @version  1.3.22
 */
File.setMethod(function overwrite(contents, options = {}) {

	let pledge = new Pledge();

	options.flag = 'w';

	fs.writeFile(this.path, contents, options, function done(err) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve();
	});

	return pledge;
});