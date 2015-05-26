var chokidar = alchemy.use('chokidar'),
    cwd      = process.cwd(),
    fs       = require('fs'),
    allowed  = /\.js$|\.json$|\.ejs$|^((?!\.).)*$/, // Allow these extensions, or no extensions at all
    ignored  = /^app\/public\/views|^temp/,
    count    = 0,
    watcher,
    watchlog,
    watchtimer,
    allowedPattern,
    extensions = ['js', 'json', 'ejs'];

if (alchemy.settings.config.restartOnFileChange) {

	// Get the allowed extensions
	if (Array.isArray(alchemy.settings.config.restartExtensions)) {
		extensions = alchemy.settings.config.restartExtensions;
	}

	allowedPattern = '';

	// Go over every extensionin the array
	extensions.forEach(function(extension) {

		if (allowedPattern) {
			allowedPattern += '|';
		}

		allowedPattern += '\\.' + extension + '$';
	});

	// Create the regex
	allowed = new RegExp(allowedPattern);

	watchlog = function watchlog() {
		log.warn(String(count).red.bold + ' files are being monitored for changes');
	};

	// Start watching all the files, starting with the current working directory
	watcher = chokidar.watch(cwd, {ignored: function ignoreThisPath(path) {

		var isAllowed,
		    stat,
		    file;

		if (watchtimer) {
			clearTimeout(watchtimer);
		}

		// Ignore git folders
		if (path.indexOf('.git') > -1) {
			return true;
		}

		watchtimer = setTimeout(watchlog, 450);

		path = path.replace(cwd+'/', '');
		file = path.split('/');
		file = file[file.length-1];

		// Only allow the specified extensions
		isAllowed = allowed.exec(file);

		// If it's already false, return it
		if (!isAllowed) {
			// Only disallow if it's not a directory
			if (!fs.statSync(path).isDirectory()) {
				return true;
			}
		}

		// See if it's still allowed based on patterns to ignore
		isAllowed = !ignored.exec(path);

		// If it's still allowed, make sure it isn't 3 or more node_modules deep
		if (isAllowed && path.count('node_modules') > 2) {
			isAllowed = false;
		}

		// If it's still allowed, increase the watch count
		if (isAllowed) {
			count++;
		}

		// Return if it should be ignored or not
		return !isAllowed;

	}, persistent: true});

	// Kill the server when any of the files change
	watcher.on('change', function(path, stats) {

		// Don't do anything if alchemy hasn't finished loading
		if (!alchemy.loaded) {
			return false;
		}

		// Also skip files that have changed in the temporary target
		if (path.indexOf('app/public/views/') > -1) {
			return false;
		}

		// Skip hawkejs client file
		if (path.indexOf('hawkejs-client-side.js') > -1) {
			return false;
		}

		// Skip protoblast client files
		if (path.indexOf('protoblast/client-file') > -1) {
			return false;
		}

		// Also skip files in the temp directory
		if (path.indexOf('temp/') === 0) {
			return false;
		}

		// Only allow .js, .json & .ejs files
		if (!allowed.exec(path)) {
			return false;
		}

		// This actually does not restart the server, it just kills it.
		// You should run it together with forever
		die('Killing server because "' + path.replace(cwd + '/', '').bold + '" has been modified');
	});
}