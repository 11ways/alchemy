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

	// Use a map to log path results, because chokidar calls the `ignored`
	// option multiple times for each file
	let seen_map = new Map();

	// Start watching all the files, starting with the current working directory
	watcher = chokidar.watch(cwd, {ignored: function ignoreThisPath(_path) {

		let cached = seen_map.get(_path);

		if (cached != null) {
			return cached;
		}

		let isAllowed,
		    path = _path,
		    stat = arguments[1],
		    file;

		// Ignore git folders
		if (~path.indexOf('.git')) {
			seen_map.set(_path, true);
			return true;
		}

		// Ignore non-stylesheet files in asset or public folders
		if (~path.indexOf('/assets/') || ~path.indexOf('/public/')) {
			// DO watch less files, for the stylesheet reload!
			if (path.indexOf('.') > -1 && !path.endsWith('.less') && !path.endsWith('.css') && !path.endsWith('.scss')) {
				seen_map.set(_path, true);
				return true;
			} else {
				isAllowed = true;
			}
		}

		// Skip some big module folders by default
		if (path.endsWith('/less') || path.endsWith('/caniuse-lite') || path.endsWith('/bcrypt') || path.endsWith('/sass') || path.endsWith('/mmmagic') || path.endsWith('/node-gyp') || path.endsWith('/lodash')) {
			seen_map.set(_path, true);
			return true;
		}

		watchlog();

		if (count > 4999) {
			if (count == 5000) {
				count++
				log.warn('Already watching 5000 files, not watching any more');
			}

			seen_map.set(_path, true);
			return true;
		}

		path = path.replace(cwd+'/', '');
		file = path.split('/');
		file = file[file.length-1];

		if (file == 'package.json' || file == 'package-lock.json' || file.startsWith('scratch')) {
			seen_map.set(_path, true);
			return true;
		}

		if (path.count('/coverage/') || path.count('/.') || path.count('/test/') || path.count('/benchmark/') || path.count('/deoptigate/')) {
			seen_map.set(_path, true);
			return true;
		}

		if (isAllowed == null) {
			// Only allow the specified extensions
			isAllowed = allowed.exec(file);
		}

		// If it's already false, return it
		if (!isAllowed) {
			// Only disallow if it's not a directory
			try {

				// The stat supplied by chokidar (if it is suppliad at all)
				// does not follow symlinks, so *sigh* get it again
				stat = fs.statSync(path);

				if (!stat.isDirectory()) {
					seen_map.set(_path, true);
					return true;
				}
			} catch (err) {
				seen_map.set(_path, true);
				// Ignore files that have been removed
				return true;
			}
		}

		// See if it's still allowed based on patterns to ignore
		isAllowed = !ignored.exec(path);

		if (isAllowed && path.count('/plugins/') == 1 && path.count('node_modules')) {
			isAllowed = false;
		}

		if (isAllowed && path.count('node_modules')) {
			if (path.count('/codecov/') || path.count('/mocha/') || path.count('/nyc/')) {
				isAllowed = false;
			}
		}

		// If it's still allowed, make sure it isn't 2 or more node_modules deep
		if (isAllowed && path.count('node_modules') > 1) {

			if (path.count('node_modules') == 2 && path.endsWith('node_modules')) {
				isAllowed = true;
			} else if (path.count('protoblast') || path.count('hawkejs') || path.count('janeway')) {
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

		seen_map.set(_path, !isAllowed);

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

		// Skip assets or public files
		if (path.indexOf('/assets/') > -1 || path.indexOf('/public/') > -1) {

			if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.less')) {
				broadcastReload(path);
			}

			return false;
		}

		// Only allow defined extensions
		if (!allowed.exec(path)) {
			return false;
		}

		// Kill the process, run together with something like "forever" to restart
		die('Killing server because', JSON.stringify(path.replace(cwd + '/', '')), 'has been modified');
	});

	let broadcastReload = Function.throttle(function broadcastReload(path) {
		alchemy.broadcast('css_reload', path);
	}, 10, false, true);
}