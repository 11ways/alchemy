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

