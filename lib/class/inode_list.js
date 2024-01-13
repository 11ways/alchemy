/**
 * The Inode List class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Array}   entries   The directory entries
 */
var List = Function.inherits(['Alchemy.Base', 'Array'], 'Alchemy.Inode', function List(entries) {
	this.entries = entries || [];
});

/**
 * Return the length of the entries
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
List.setProperty(function length() {
	return this.entries.length;
});

/**
 * Iterator method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
List.setMethod(Symbol.iterator, function* iterate() {

	var i;

	for (i = 0; i < this.entries.length; i++) {
		yield this.entries[i];
	}
});

/**
 * Load the contents of directories?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Promise}
 */
List.setMethod(async function loadDirContents(options) {

	if (!options) {
		options = {};
	}

	if (options.recursive === true) {
		options.recursive = Infinity;
	}

	if (options.recursive == null) {
		options.recursive = 1;
	}

	if (!options.recursive || options.recursive < 1) {
		return;
	}

	for (let entry of this.entries) {
		if (entry.is_directory) {
			await entry.loadContents({recursive: options.recursive - 1});
		}
	}
});