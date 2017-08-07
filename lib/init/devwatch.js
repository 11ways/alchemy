'use strict';

var allowedPattern,
    extensions,
    prevcount,
    watchlog,
    chokidar,
    watcher,
    allowed,
    ignored,
    count,
    cwd,
    fs;

if (process.argv.indexOf('--disable-devwatch') > -1) {
	return;
}

if (alchemy.settings.kill_on_file_change) {

	chokidar = alchemy.use('chokidar');

	if (!chokidar) {
		log.warn('Can not watch files because Chokidar is not installed');
		return;
	}

	fs = alchemy.use('fs');

	prevcount = 0;
	count = 0;

	ignored = /^app\/public\/views|^temp/;
	extensions = ['js', 'json'];
	cwd = process.cwd();

	// Get the extensions allowed to kill the server
	if (Array.isArray(alchemy.settings.kill_extensions)) {
		extensions = alchemy.settings.kill_extensions;
	}

	allowedPattern = '';

	// Go over every extensionin the array
	extensions.forEach(function eachExtension(extension) {

		if (allowedPattern) {
			allowedPattern += '|';
		}

		allowedPattern += '\\.' + extension + '$';
	});

	// Create the regex
	allowed = new RegExp(allowedPattern);

	watchlog = Function.throttle(function watchlog() {

		if (prevcount == count) {
			return;
		}

		log.warn(count, 'files are being monitored for changes');
		prevcount = count;
	}, 1500, false, true);

	// Start watching all the files, starting with the current working directory
	watcher = chokidar.watch(cwd, {ignored: function ignoreThisPath(_path) {

		var isAllowed,
		    depth,
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

		watchlog();

		path = path.replace(cwd+'/', '');
		file = path.split('/');
		file = file[file.length-1];

		depth = path.count('/');

		if (depth > 7) {
			return false;
		}

		if (count > 9999) {
			if (count == 10000) {
				count++
				log.warn('Already watching 10.000 files, not watching any more');
			}

			return false;
		}

		// Only allow the specified extensions
		isAllowed = allowed.exec(file);

		// If it's already false, return it
		if (!isAllowed) {
			// Only disallow if it's not a directory
			try {
				if (!fs.statSync(path).isDirectory()) {
					return true;
				}
			} catch (err) {
				// Ignore files that have been removed
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
		die('Killing server because', JSON.stringify(path.replace(cwd + '/', '')), 'has been modified');
	});
}