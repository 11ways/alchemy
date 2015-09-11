var chokidar = alchemy.use('chokidar'),
    cwd      = process.cwd(),
    fs       = alchemy.use('fs'),
    allowed, // Allowed extensions
    ignored  = /^app\/public\/views|^temp/,
    count    = 0,
    prevcount = 0,
    watcher,
    watchlog,
    watchtimer,
    allowedPattern,
    extensions = ['js', 'json'];

if (alchemy.settings.kill_on_file_change) {

	// Get the extensions allowed to kill the server
	if (Array.isArray(alchemy.settings.kill_extensions)) {
		extensions = alchemy.settings.kill_extensions;
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

		if (prevcount == count) {
			return;
		}

		log.warn(String(count).red.bold + ' files are being monitored for changes');
		prevcount = count;
	};

	// Start watching all the files, starting with the current working directory
	watcher = chokidar.watch(cwd, {ignored: function ignoreThisPath(_path) {

		var isAllowed,
		    path = _path,
		    stat,
		    file;

		// Ignore git folders
		if (~path.indexOf('.git')) {
			return true;
		}

		// Ignore asset folders
		if (~path.indexOf('assets/')) {
			return true;
		}

		// Ignore public folders
		if (~path.indexOf('public/')) {
			return true;
		}

		if (watchtimer) {
			clearTimeout(watchtimer);
		}

		watchtimer = setTimeout(watchlog, 500);

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

		// If it's still allowed, make sure it isn't 2 or more node_modules deep
		if (isAllowed && path.count('node_modules') > 1) {

			if (path.count('node_modules') == 2 && path.endsWith('node_modules')) {
				isAllowed = true;
			} else 

			if (path.count('protoblast') || path.count('hawkejs')) {
				if (path.count('node_modules') > 2) {
					isAllowed = false;
				}
			} else {
				isAllowed = false;
			}
		}

		// If it's still allowed, increase the watch count
		if (isAllowed) {
			count++;
		}

		// Return if it should be ignored or not
		return !isAllowed;

	}, persistent: true});

	// Kill the server when any of the files change
	watcher.on('change', function onFileChange(path, stats) {

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

		// Only allow defined extensions
		if (!allowed.exec(path)) {
			return false;
		}

		// Kill the process, run together with something like "forever" to restart
		die('Killing server because "' + path.replace(cwd + '/', '').bold + '" has been modified');
	});
}