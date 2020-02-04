const libpath = alchemy.use('path'),
      fs = alchemy.use('fs');

/**
 * Base Inode class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * Process given path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String|Array}   full_path
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Inode.setProperty('is_directory', false);

/**
 * Things are not files by default
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Inode.setProperty('is_file', false);

/**
 * The extension of this inode
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Inode.setProperty(function extension() {
	return libpath.extname(this.name);
});

/**
 * The basename of this inode
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Inode.setProperty(function basename() {
	return libpath.basename(this.name);
});

/**
 * The rootname of this inode
 * (basename without extension)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Inode.setProperty(function rootname() {

	let extension = this.extension;

	if (!extension) {
		return this.basename;
	}

	return libpath.basename(this.name, extension);
});