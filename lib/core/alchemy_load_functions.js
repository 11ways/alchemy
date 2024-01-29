let fs               = alchemy.use('fs'),
    libpath          = alchemy.use('path'),
    LOADED           = Symbol('LOADED'),
    _duplicateCheck  = {};

/**
 * Require the given path.
 * The path follows an app structure.
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}  dir_path
 * @param    {Object}  options
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function useAppPath(dir_path, options) {

	if (!options) {
		options = {};
	}

	if (options.plugin && options.weight == null) {
		options.weight = 15;
	}

	let context = options?.plugin || this;

	let server_directories = new Map(),
	    helper_directories = new Map(),
	    files = new Map();

	let config_directory,
	    asset_directory,
	    view_directory,
	    public_path,
	    root_path;

	// Loop over all the entries in the app directory
	eachDirectoryEntryStats(dir_path, (file_path, name, stat) =>  {

		if (stat.isDirectory()) {
			let corrected_name,
			    is_helper = false;

			if (name == 'helper' || name == 'element') {
				corrected_name = name;
				is_helper = true;
			} else if (name.startsWith('helper_')) {
				corrected_name = name.slice(7);
				is_helper = true;
			} else if (name == 'assets') {
				asset_directory = file_path;
				return;
			} else if (name == 'view') {
				view_directory = file_path;
				return;
			} else if (name == 'public') {
				public_path = file_path;
				return;
			} else if (name == 'root') {
				root_path = file_path;
				return;
			} else if (name == 'config') {
				config_directory = file_path;
				return;
			} else if (name == 'source') {
				return;
			}

			if (is_helper) {
				helper_directories.set(corrected_name, file_path);
			} else {
				server_directories.set(name, file_path);
			}
		}

		files.set(name, file_path);
	});

	// Load the bootstrap file first
	if (files.get('bootstrap.js')) {

		if (!options.plugin) {
			context.useOnce(files.get('bootstrap.js'));
		}

		files.delete('bootstrap.js');
	}

	if (config_directory) {
		context.usePath(config_directory, options);
	}

	if (options.helpers !== false) {

		if (helper_directories.get('error')) {
			this.useHelperPath(helper_directories.get('error'));
			helper_directories.delete('error');
		}

		if (helper_directories.get('datasource')) {
			this.useHelperPath(helper_directories.get('datasource'));
			helper_directories.delete('datasource');
		}

		if (helper_directories.get('field')) {
			this.useHelperPath(helper_directories.get('field'));
			helper_directories.delete('field');
		}

		if (helper_directories.get('helper')) {
			this.useHelperPath(helper_directories.get('helper'));
			helper_directories.delete('helper');
		}
	}

	// Load the server-side code next
	for (let [name, file_path] of server_directories) {
		context.usePath(file_path);
	}

	if (options.helpers !== false) {

		if (helper_directories.get('element')) {
			this.useHelperPath(helper_directories.get('element'));
			helper_directories.delete('element');
		}

		if (helper_directories.get('model')) {
			this.useHelperPath(helper_directories.get('model'));
			helper_directories.delete('model');
		}

		if (helper_directories.get('document')) {
			this.useHelperPath(helper_directories.get('document'));
			helper_directories.delete('document');
		}

		if (helper_directories.get('controller')) {
			this.useHelperPath(helper_directories.get('controller'));
			helper_directories.delete('controller');
		}

		if (helper_directories.get('component')) {
			this.useHelperPath(helper_directories.get('component'));
			helper_directories.delete('component');
		}

		if (helper_directories.get('validator')) {
			this.useHelperPath(helper_directories.get('validator'));
			helper_directories.delete('validator');
		}

		for (let [name, file_path] of helper_directories) {
			this.useHelperPath(file_path);
		}
	}

	if (view_directory && options.views !== false) {
		alchemy.addViewDirectory(view_directory, options.weight);
	}

	if (asset_directory) {
		// Add the main asset directory
		alchemy.addAssetDirectory(asset_directory, options.weight);

		if (options.scripts !== false) {
			alchemy.addScriptDirectory(libpath.resolve(asset_directory, 'scripts'), options.weight);
		}

		if (options.stylesheets !== false) {
			alchemy.addStylesheetDirectory(libpath.resolve(asset_directory, 'stylesheets'), options.weight);

			// Also add the public folder, so less files in there can also be compiled
			alchemy.addStylesheetDirectory(libpath.resolve(dir_path, 'public'), options.weight);
		}

		if (options.fonts !== false) {
			alchemy.addFontDirectory(libpath.resolve(asset_directory, 'fonts'), options.weight);
		}

		if (options.images !== false) {
			alchemy.addImageDirectory(libpath.resolve(asset_directory, 'images'), options.weight);
		}
	}

	if (public_path && options.public !== false) {
		alchemy.addPublicDirectory(public_path, options.weight);
	}

	if (root_path && options.root !== false) {
		alchemy.addRootDirectory(root_path, options.weight);
	}
});

/**
 * Require the given helper path
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}  dir_path
 * @param    {Object}  options
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function useHelperPath(dir_path, options) {

	let sub_directories = [];

	eachDirectoryEntryStats(dir_path, (file_path, name, stat) =>  {

		if (stat.isDirectory()) {
			sub_directories.push(file_path);
			return;
		}

		try {
			alchemy.hawkejs.load(file_path, {
				arguments : 'hawkejs'
			});
		} catch (err) {
			alchemy.printLog('warning', ['Unable to add helper file ' + name + '\n' + String(err), err], {err: err, level: -2});
			alchemy.printLog('warning', ['File was at', file_path], {err: err, level: -2});
		}
	});

	for (let dir of sub_directories) {
		this.useHelperPath(dir, options);
	}
});

/**
 * Require all the files in the given path.
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}  dir_path
 * @param    {Object}  options
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function usePath(dir_path, options) {

	let recursive = options?.recursive !== false,
	    sub_directories = [];

	let context = options?.plugin || this;

	eachDirectoryEntryStats(dir_path, (file_path, name, stat) =>  {

		if (stat.isDirectory()) {
			if (recursive) {
				sub_directories.push(file_path);
			}
			return;
		}

		context.useOnce(file_path);
	});

	if (recursive && sub_directories.length) {
		for (let dir of sub_directories) {
			context.usePath(dir, options);
		}
	}
});

/**
 * Iterate over a directory's content, but only 
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}    path
 * @param    {Function}  callback
 */
function eachDirectoryEntryStats(path, callback) {

	let extension,
	    file_path,
	    files = fs.readdirSync(path),
	    stat;

	for (let file of files) {

		// Ignore all the hidden files
		if (file[0] == '.') {
			continue;
		}

		switch (file) {
			case 'node_modules':
			case 'test':
			case 'empty':
			case 'migrations':
				continue;
		}

		// Ignore manual files
		if (file.includes('.manual.')) {
			continue;
		}

		extension = libpath.extname(file).toLowerCase();

		switch (extension) {
			case '.md':
			case '.json':
				continue;
		}

		file_path = libpath.resolve(path, file);
		stat = fs.lstatSync(file_path);
		
		callback(file_path, file, stat);
	}
}

/**
 * Default _usePath options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @type     {Object}
 */
Alchemy.setProperty('default_use_path_options', {
	ignore    : false,
	recursive : -1,
	_level    : -1,

	// Load the bootstrap.js file first
	bootstrap : true,

	// Load the app_ file afterwards
	app       : true
});

/**
 * Add an asset directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addAssetDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('asset.directories').push(dirPath, weight);
});

/**
 * Add a scripts directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addScriptDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('script.directories').push(dirPath, weight);
});

/**
 * Add a stylesheets directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addStylesheetDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('stylesheet.directories').push(dirPath, weight);
});

/**
 * Add a font directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addFontDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('font.directories').push(dirPath, weight);
});

/**
 * Add an image directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addImageDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('images.directories').push(dirPath, weight);
});

/**
 * Add a public directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addPublicDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('public.directories').push(dirPath, weight);
});

/**
 * Add a root directory
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addRootDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('root.directories').push(dirPath, weight);
});

/**
 * Tell hawkejs to use this path to look for views.
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {string}  dirPath    The path to load
 * @param    {number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addViewDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.hawkejs.addViewDirectory(dirPath, weight);
});

/**
 * Prepare a plugin for use.
 * This immediately executes the plugin's bootstrap.js file,
 * but the loading of the app tree happens later.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {string}   name      The name of the plugin (which is its path)
 * @param    {Object}   options   Options to pass to the plugin
 *
 * @return   {Alchemy.Plugin}
 */
Alchemy.setMethod(function usePlugin(name, options) {

	let full_name;

	// Strip of the "alchemy-" from the name, should it be given
	if (name.startsWith('alchemy-')) {
		full_name = name;
		name = name.slice(8);
	} else {
		// The "full" name starts with "alchemy-"
		full_name = 'alchemy-' + name;
	}

	// Make sure the plugin hasn't been loaded already
	if (alchemy.plugins[name] != null) {

		if (options) {
			log.warn('Tried to load plugin "' + name + '" with options twice!');
		}

		return true;
	}

	if (options == null) {
		options = {};
	}

	// Create the possible paths to this plugin
	let possible_paths = [];

	if (options.path_to_plugin) {
		possible_paths.push(options.path_to_plugin);
	} else {
		// Look for the "alchemy-" path first
		possible_paths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', full_name));
		possible_paths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', name));

		// It's also allowed to be inside the app/plugins folder
		possible_paths.push(alchemy.pathResolve(PATH_APP, 'plugins', full_name));
		possible_paths.push(alchemy.pathResolve(PATH_APP, 'plugins', name));
	}

	let path_to_plugin,
	    is_dir = false;

	for (let path of possible_paths) {
		try {
			let plugin_stat = fs.lstatSync(path);
			is_dir = plugin_stat.isDirectory() || plugin_stat.isSymbolicLink();
			path_to_plugin = path;
			break;
		} catch (err) {
			// Ignore
		}
	}

	if (!is_dir) {
		log.error('Could not find ' + JSON.stringify(name) + ' plugin directory');
		return false;
	}

	let instance = new Classes.Alchemy.Plugin(name, path_to_plugin, options);

	// Set the given options
	alchemy.plugins[name] = instance;

	instance.doPreload();

	return instance;
});

/**
 * If a plugin hasn't been loaded yet, but it is required, die
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {string|Array}   names
 * @param    {boolean}        attempt_require
 */
Alchemy.setMethod(function requirePlugin(names, attempt_require) {

	var message,
	    missing = '',
	    name,
	    temp,
	    i;

	if (attempt_require == null) {
		attempt_require = true;
	}

	if (!Array.isArray(names)) {
		names = [names];
	}

	for (i = 0; i < names.length; i++) {

		name = names[i];

		if (typeof alchemy.plugins[name] === 'undefined') {

			if (attempt_require) {
				temp = alchemy.usePlugin(name);

				if (temp) {
					let plugin_stage = STAGES.getStage('load_app.plugins');

					if (!plugin_stage || plugin_stage.started) {
						// If the plugin stage has already started,
						// manually start this plugin now
						alchemy.startPlugins(name);
					}
					continue;
				}
			}

			if (missing) {
				missing += ', ';
			}

			missing += name;
		}
	}

	if (missing) {
		message = 'These required plugin(s) are missing: ' + missing;
		die(message, {level: 2});
	}
});

/**
 * Load in a file only once
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.1.0
 */
Alchemy.setMethod(function useOnce(dirPath, options) {

	if (typeof options == 'undefined') {
		options = {};
	}

	dirPath = alchemy.pathResolve.apply(null, arguments);

	if (typeof _duplicateCheck[dirPath] === 'undefined') {

		// Mainly used for tidying up the unit tests
		if (process.env.NO_ALCHEMY_LOAD_WARNING == 1) {
			options.throwError = false;
			options.silent = true;
		}

		if (options.client == null) {
			options.client = false;
		}

		try {
			Blast.require(dirPath, options);
			_duplicateCheck[dirPath] = true;
			//log.verbose('Used file once: ' + dirPath, {level: 1});
		} catch (err) {

			// Add the path to the file that failed to load,
			// this can be used when it's a syntax error
			// (It's hard to find the cause otherwise)
			err.file_path = dirPath;

			_duplicateCheck[dirPath] = false;

			if (options.throwError !== false) {

				if (options.throwError !== true) {
					let yellow = __Janeway.esc('103;91');
					alchemy.printLog('error', [yellow + '========================='], {err: err, level: -2});
					alchemy.printLog('error', [yellow + ' Failed to load file:    '], {err: err, level: -2});
					alchemy.printLog('error', [yellow + '  »', dirPath.split(libpath.sep).last()], {err: err, level: -2});
					alchemy.printLog('error', [yellow + ' In directory:           '], {err: err, level: -2});
					alchemy.printLog('error', [yellow + '  »', dirPath.split(libpath.sep).slice(0, -1).join(libpath.sep)], {err: err, level: -2});
					alchemy.printLog('error', [yellow + ' With error:             '], {err: err, level: -2});
					alchemy.printLog('error', [yellow + '  »', err], {err: err, level: -2});
					alchemy.printLog('error', [yellow + '========================='], {err: err, level: -2});
				}

				throw err;
			}

			if (!options.silent) {
				// @todo: "Failed to use file once..." message doesn't get displayed
				log.error('Failed to use file once: ' + dirPath, {level: 5, err: err, extra: true});
			}
		}
	} else {
		//log.verbose('File not loaded, already used once: ' + dirPath, {level: 1});
	}
});
