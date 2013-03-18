var fs = require('fs');
var path = require('path');

/**
 * Load in the app controllers & models
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   app_path       The path
 */
alchemy.loadApp = function loadApp (app_path) {
	
	// Counters
	var dir_count;
	var file_count;
	
	// The expected end of the file name
	var fileTail;
	
	// The active directory
	var dirName;
	
	// The plural
	var dirPlural;
	
	// Directories to parse
	var dirs = ['model', 'controller'];
	
	// List of files in active directory
	var files;
	
	// The active file
	var fileName;
	
	for (dir_count in dirs) {
		
		dirName = dirs[dir_count];
		dirPlural = alchemy.inflect.pluralize(dirName);
		fileTail = '_' + dirName + '.js';
		
		// Attempt to read in the app_ file
		try {
			require(path.resolve(app_path, dirPlural, 'app' + fileTail));
		} catch (err) {
			// Do nothing if the file does not exist
		}
		
		// Read in all the files
		files = fs.readdirSync(path.resolve(app_path, dirPlural));
		
		for (file_count in files) {
			
			fileName = files[file_count];
			
			// Do not read in app_ files, we do this ourselves
			if (fileName != 'app' + fileTail) {
				require(path.resolve(app_path, dirPlural, fileName));
			}
			
		}
	}
	
}

/**
 * Add a simple route with a callback
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   path       The url
 * @param   {object}   callback   The callback function
 * @param   {string}   method     What method to use, default = get
 */
alchemy.addRoute = function addRoute (path, callback, method) {
	
	if (method === undefined) method = 'get';
	
	alchemy._app[method](path, callback);
	
}

/**
 * Add a route the MVC way
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   path       The url
 * @param   {object}   callback   The callback function
 * @param   {string}   method     What method to use, default = get
 */
alchemy.connect = function connect (name, paths, options) {
	
	var locale;
	var path;
	var fullPath;
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.method == 'undefined') options.method = 'get';
	
	if (typeof paths == 'string') paths = {'': paths};
	
	for (locale in paths) {
		
		path = paths[locale];
		
		fullPath = '/';
		if (locale) fullPath += locale + '/';
		fullPath += path;
		
		alchemy._app[options.method](fullPath, function(req, res) {
			
			var thisController = Controller.get(options.controller);
			
			thisController[options.action]();
			
			
		});
	}
}