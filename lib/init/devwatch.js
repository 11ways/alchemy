var chokidar = alchemy.use('chokidar'),
    cwd      = process.cwd(),
    allowed  = /\.js$|\.json$|\.ejs$|^((?!\.).)*$/, // Allow these extensions, or no extensions at all
    ignored  = /^app\/public\/views|^temp/,
    count    = 0,
    watcher,
    watchlog,
    watchtimer;

if (alchemy.settings.config.restartOnFileChange) {

	watchlog = function watchlog() {
		log.warn(String(count).red.bold + ' files are being monitored for changes');
	};

	// Start watching all the files, starting with the current working directory
	watcher = chokidar.watch(cwd, {ignored: function ignoreThisPath(path) {

		var isAllowed,
		    file;

		if (watchtimer) {
			clearTimeout(watchtimer);
		}

		watchtimer = setTimeout(watchlog, 450);

		path = path.replace(cwd+'/', '');
		file = path.split('/');
		file = file[file.length-1];

		// Only allow the specified extensions
		isAllowed = allowed.exec(file);

		// If it's already false, return it
		if (!isAllowed) {
			return true;
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