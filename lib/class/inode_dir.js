/**
 * The Directory class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path   Path to the directory
 */
var Directory = Function.inherits('Alchemy.Inode', function Directory(path) {
	Directory.super.call(this, path);

	// The contents of this directory
	this.contents = new Classes.Alchemy.Inode.List([]);
});

/**
 * Directories are obviously directories
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
Directory.setProperty('is_directory', true);

/**
 * Load this directory's contents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String|Regex}   regex
 *
 * @return   {Boolean}
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Directory.setMethod(Symbol.iterator, function* iterate() {

	var i;

	for (i = 0; i < this.contents.entries.length; i++) {
		yield this.contents.entries[i];
	}
});
