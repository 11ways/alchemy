const libpath = alchemy.use('path');

/**
 * The Directory class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   path   Path to the directory
 */
var Directory = Function.inherits('Alchemy.Inode', function Directory(path) {
	Directory.super.call(this, path);

	// The contents of this directory
	this.contents = new Classes.Alchemy.Inode.List([]);
});

/**
 * Directories are obviously directories
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
Directory.setProperty('is_directory', true);

/**
 * Load this directory's contents
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Promise}
 */
Directory.setMethod(async function loadContents(options) {

	if (!options) {
		options = {};
	}

	if (options.recursive === true) {
		options.recursive = Infinity;
	}

	if (options.recursive == null) {
		options.recursive = 1;
	}

	let contents = await alchemy.readDir(this.path),
	    recursive = options.recursive - 1;

	this.contents.entries = contents.entries;
	contents = this.contents;

	if (recursive > 0) {
		await contents.loadDirContents({recursive});
	}

	return contents;
});

/**
 * See if this directory contains any entries matching the given name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string|Regex}   regex
 *
 * @return   {boolean}
 */
Directory.setMethod(function contains(regex) {

	if (!this.contents.length) {
		return false;
	}

	if (typeof regex == 'string') {
		regex = RegExp.interpret(regex);
	}

	for (let entry of this.contents) {
		if (regex.test(entry.name)) {
			return true;
		}
	}

	return false;
});

/**
 * Iterator over the contents of this directory
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Directory.setMethod(Symbol.iterator, function* iterate() {

	var i;

	for (i = 0; i < this.contents.entries.length; i++) {
		yield this.contents.entries[i];
	}
});

/**
 * Get a file from this directory, or its subdirectory
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.8
 * @version  1.1.8
 *
 * @param    {string|string[]}   path
 *
 * @return   {Alchemy.Inode}
 */
Directory.setMethod(async function get(path) {

	if (!Array.isArray(path)) {
		path = path.split(libpath.sep);
	}

	if (!this.contents.length) {
		await this.loadContents();
	}

	let current,
	    result = this,
	    piece,
	    entry;

	for (piece of path) {
		current = result;
		result = null;

		// If the current piece isn't a directory we can end now
		if (!current.is_directory) {
			break;
		}

		// Loop over all the entries of the current directory
		for (entry of current) {
			if (piece == entry.name) {
				result = entry;
				break;
			}
		}

		if (!result) {
			return null;
		}
	}

	return result;
});

/**
 * Return a list of all files
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.8
 * @version  1.1.8
 *
 * @return   {Alchemy.Inode.List}
 */
Directory.setMethod(async function flatten() {

	if (!this.contents.length) {
		await this.loadContents({recursive: true});
	}

	let info = {
		start : this.path,
		seen  : new Set(),
		list  : new Classes.Alchemy.Inode.List([]),
	};

	flattenFiles(this, info);

	return info.list;
});

/**
 * Add all files to the given list
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.8
 * @version  1.1.8
 *
 * @param    {Alchemy.Inode.Directory}   current
 * @param    {Object}                    info
 *
 * @return   {Alchemy.Inode.List}
 */
function flattenFiles(current, info) {

	if (info.seen.has(current.path)) {
		return;
	}

	info.seen.add(current.path);

	let entry,
	    dirs = [];

	for (entry of current) {
		if (entry.is_file) {
			info.list.entries.push(entry);
		} else {
			dirs.push(entry);
		}
	}

	for (entry of dirs) {
		flattenFiles(entry, info);
	}
}