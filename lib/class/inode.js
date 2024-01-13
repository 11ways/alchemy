const libpath = alchemy.use('path'),
      fs = alchemy.use('fs');

/**
 * Base Inode class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 */
var Inode = Function.inherits('Alchemy.Base', 'Alchemy.Inode', function Inode(path) {

	// The full path to the file/dir
	this.path = path;

	// The path to the parent directory
	this.dir_path = null;

	// The name of the file/dir
	this.name = null;

	// The stat object
	this.stat = null;
});

/**
 * Get the correct Inode instance for the given path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 * 
 * @param    {string}   path
 *
 * @return   {Pledge<Inode>}
 */
Inode.setStatic(function from(path) {

	const pledge = new Pledge();

	Inode.process(path, null, (err, inode) => {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(inode);
	});

	return pledge;
});

/**
 * Process given path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string|Array}   full_path
 */
Inode.setStatic(function process(full_path, options, next) {

	var dir_path,
	    instance,
	    name;

	if (typeof full_path != 'string') {
		dir_path = full_path[0];
		name = full_path[1];
		full_path = libpath.resolve(dir_path, name);
	} else {
		dir_path = libpath.dirname(full_path);
		name = libpath.basename(full_path);
	}

	fs.stat(full_path, function gotStat(err, stat) {

		if (err) {
			return next(err);
		}

		if (stat.isDirectory()) {
			instance = new Classes.Alchemy.Inode.Directory(full_path);
		} else {
			instance = new Classes.Alchemy.Inode.File(full_path);
		}

		instance.dir_path = dir_path;
		instance.name = name;
		instance.stat = stat;

		next(null, instance);
	});
});

/**
 * Things are not directories by default
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Inode.setProperty('is_directory', false);

/**
 * Things are not files by default
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Inode.setProperty('is_file', false);

/**
 * The extension of this inode
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
Inode.setProperty(function extension() {
	return libpath.extname(this.name);
});

/**
 * The basename of this inode
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
Inode.setProperty(function basename() {
	return libpath.basename(this.name);
});

/**
 * The rootname of this inode
 * (basename without extension)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
Inode.setProperty(function rootname() {

	let extension = this.extension;

	if (!extension) {
		return this.basename;
	}

	return libpath.basename(this.name, extension);
});

/**
 * Get the stat object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.8
 * @version  1.1.8
 *
 * @param    {boolean}   refresh
 *
 * @return   {Pledge<fs.Stats>}
 */
Inode.setMethod(function getStats(refresh) {

	if (!refresh && this.stat) {
		return Pledge.resolve(this.stat);
	}

	let pledge = new Pledge();

	fs.stat(this.path, (err, stat) => {

		if (err) {
			return pledge.reject(err);
		}

		this.stat = stat;
		pledge.resolve(stat);
	});

	return pledge;
});

/**
 * Does this inode still exist?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.8
 * @version  1.1.8
 *
 * @return   {boolean}
 */
Inode.setMethod(async function exists() {

	let stat;

	try {
		stat = await this.getStats(true);
	} catch (err) {
		if (err.code == 'ENOENT') {
			return false;
		} else {
			return null;
		}
	}

	if (!stat) {
		return false;
	}

	return true;
});