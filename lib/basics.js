/**
 * A wrapper function for requiring modules
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   moduleName     The name/path of the module to load
 * @param   {object}   options        Extra options
 *                     options.force  Force a new requirement and do not cache
 *
 * @returns {object}   The result of the require()
 */
alchemy.use = function use (moduleName, options) {
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.force == 'undefined') options.force = false;
	
	if (typeof alchemy.requirements[moduleName] == 'undefined' && !options.force) {
		alchemy.requirements[moduleName] = require(moduleName);
	}
	
	// If we want to force a new requirement
	if (options.force) {
		return require(moduleName);
	} else {
		return alchemy.requirements[moduleName];
	}
}

/**
 * Require all files in a certain directory.
 * Does not cache the files.
 * 
 * Start with the 'app_' file if it's available.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToFiles      The path to load
 *
 * @returns {boolean}  If we were able to load in the directory
 */
alchemy.usePath = function usePath (pathToFiles, options) {
	
	// Get some modules from the cache
	var fs = alchemy.use('fs');
	var path = alchemy.use('path');
	
	// Declarations
	var files = false, fileCount, fileName, fileStat, filePath;
	
	// Read in the directory file listing
	try {
		files = fs.readdirSync(pathToFiles);
	} catch (err) {
		// We were not able to read out the folder
		return false;
	}
	
	// Look for a file starting with app_ first
	for (fileCount in files) {
		
		fileName = files[fileCount];
		
		// Require it if we found it
		if (!fileName.startsWith('app_')) continue;
			
		filePath = path.resolve(pathToFiles, fileName);
		fileStat = fs.lstatSync(filePath);
		
		// Skip directories
		if (fileStat.isDirectory()) continue;
		
		require(filePath);
		break; // Stop looking for another app_
	}
	
	for (fileCount in files) {
		
		fileName = files[fileCount];
		
		// We already loaded the app_ file
		if (fileName.startsWith('app_')) continue;
		
		filePath = path.resolve(pathToFiles, fileName);
		fileStat = fs.lstatSync(filePath);
		
		// Skip directories
		if (fileStat.isDirectory()) continue;
		
		require(filePath);
	}
	
	return true;
}

/**
 * Require an app-like folder structure
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToDirs      The path containing the dirs to load
 */
alchemy.useTree = function useTree (pathToDirs, options) {
	
	var path = alchemy.use('path');
	var fs = alchemy.use('fs');
	var hawkejs = alchemy.use('hawkejs');
	
	var helperFiles, helperPath, fileCount, filePath;
	
	// The subdirectories to load
	var appTree = ['behavior', 'controller', 'component', 'model', 'utility'];
	
	for (var i = 0; i < appTree.length; i++) {
		alchemy.usePath(path.resolve(pathToDirs, appTree[i]));
	}
	
	// Add helpers
	try {
		helperPath = path.resolve(pathToDirs, 'helper');
		helperFiles = fs.readdirSync(helperPath);

		for (fileCount in helperFiles) {
			try {
				filePath = path.resolve(pathToDirs, 'helper', helperFiles[fileCount]);
				hawkejs.addHelpers(filePath);
			} catch (err) {
				// Was unable to add the helper file
				log.warn('Was unable to add helper file ' + helperFiles[fileCount]);
			}
		}
		
	} catch (err) {
		// Was unable to read in the helper directory
		log.warn('Was unable to read in helper directory ' + helperPath);
	}
	
}

/**
 * Add datasource connections
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   datasources   An object containing datasource options
 */
alchemy.addDatasources = function addDatasources (datasources) {
	
	var mongoose = alchemy.use('mongoose');
	
	var d;
	var uri;
	
	// Make sure the db connections object exists
	if (typeof alchemy._db_connections == 'undefined') alchemy._db_connections = {};
	
	// Create a reference to that object
	var db_connections = alchemy._db_connections;
	
	for (var name in datasources) {
		
		// Get the current datasource settings
		d = datasources[name];
		
		// Prepare the uri string
		uri = 'mongodb://';
		
		// Add a login & password if needed
		if (d.login && d.password) {
			uri += d.login + ':' + d.password + '@';
		}
		
		// Add the host name or ip
		uri += d.host;
		
		// Add a port if set
		if (d.port) {
			uri += ':' + d.port;
		}
		
		// Add the database name
		uri += '/' + d.database;
		
		// Create the connection
		(function (name) {
			
			db_connections[name] = mongoose.createConnection(uri);
			
			db_connections[name].on('error', function callback (err) {
				log.error('Database ' + name + ' connection error: ' + err);
			});
			
			db_connections[name].once('open', function callback () {
				// Database connection has been made
				log.info('Database connection to ' + name + ' has been made');
			});
			
		})(name);
		
	}
}

/**
 * Copyright Andrée Hansson, 2010
 * Use it however you want, attribution would be nice though.
 * Website:        http://andreehansson.se/
 * GMail/Twitter:  peolanha
 *
 * update 4: Leonardo Dutra, http://twitter.com/leodutra
 *
 * @author   Andrée Hansson
 * @since    2010
 *
 * @param   {object}   superObj
 * @param   {object}   extension
 *
 * @returns {object}   A deeply cloned version of the extension object
 */
alchemy.clone = function(superObj, extension) {
	
	if (superObj && extension) {
		
		var deep = function() {}; // prepare sword
		
		deep.prototype = superObj; // hold it
		
		superObj = new deep; // pull it
		
		return (deep = function(o, ext) { // concentrate
			var k;
			
			for (k in ext) {
				o[k] = typeof ext[k] === 'object' && ext[k] ? deep({}, ext[k]) : ext[k];
			}
			
			return o;
		})(superObj, extension); // push it deep, slicing
	}
	
	return null;
}

/**
 * Inject the properties of one object into another target object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   target     The object to inject the extension into
 * @param   {object}   extension  The object to inject
 *
 * @returns {object}   Returns the injected target (which it also modifies byref)
 */
alchemy.inject = function inject (target, first, second) {
	
	var length = arguments.length;
	
	// Go over every argument, other than the first
	for (var i = 1; i <= length; i++) {
		var extension = arguments[i];
		
		// Go over every property of the current object
		for (var i in extension) {
			target[i] = extension[i];
		}
	}
	
	return target;
}

/**
 * See if an object is empty or not
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   o     The object to test
 *
 * @returns {boolean}
 */
alchemy.isEmpty = function isEmpty (o) {

  for(var p in o) {
    if (o[p] != o.constructor.prototype[p])
      return false;
  }
  return true;
}

var STR_PAD_LEFT = 1;
var STR_PAD_RIGHT = 2;
var STR_PAD_BOTH = 3;

/**
 * Javascript string pad
 *
 * @link   http://www.webtoolkit.info/
 *
 */ 
function pad(str, len, pad, dir) {
 
	if (typeof(len) == "undefined") { len = 0; }
	if (typeof(pad) == "undefined") { pad = ' '; }
	if (typeof(dir) == "undefined") { dir = STR_PAD_RIGHT; }
 
	if (len + 1 >= str.length) {
 
		switch (dir){
 
			case STR_PAD_LEFT:
				str = Array(len + 1 - str.length).join(pad) + str;
			break;
 
			case STR_PAD_BOTH:
				var right = Math.ceil((padlen = len - str.length) / 2);
				var left = padlen - right;
				str = Array(left+1).join(pad) + str + Array(right+1).join(pad);
			break;
 
			default:
				str = str + Array(len + 1 - str.length).join(pad);
			break;
 
		} // switch
 
	}
 
	return str;
 
}

/**
 * Get color and style in your node.js console
 *
 * @link   https://npmjs.org/package/colors
 */
require('colors');

var _logLabels = {};

(function() {
	
	var prepend, level, levels, l, output, padding;
	
	levels = {
		error: {output: 'error', color: 'red'},
		warn: {output: 'warning', color: 'yellow'},
		info: {output: 'info', color: 'green'},
		debug: {output: 'debug', color: 'rainbow'},
		verbose: {output: 'verbose', color: 'cyan'}
	};
	
	for (level in levels) {
		
		l = levels[level];
		output = l.output;
		
		prepend = '['.grey;
		prepend += output[l.color];
		prepend += ']'.grey;
		
		padding = pad(output, 7);
		padding = padding.replace(output, '');
		
		prepend = prepend + padding + ' - ';
		
		_logLabels[level] = prepend;
	}
	
})();

/**
 * Get info on the caller: what line this function was called from
 * This is done by creating an error object, which in its turn creates
 * a stack trace string we can manipulate
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {integer}   level   Skip x many callers
 *
 * @returns {object}    An object contain caller info
 */
function getCallerInfo (level) {
	
	if (typeof level == 'undefined') level = 0;
	
	level += 3;
	
	var err = (new Error);
	
	var obj = {};
	obj.stack = err.stack;
	
	// Turn the stack string into an array
	var ar = err.stack.split('\n');
	
	// Get the caller line
	var caller_line = ar[level];
	
	// Get the index
	var index = caller_line.indexOf('at ');
	
	// Get the error line, without the '  at ' part
	var clean = caller_line.slice(index+2, caller_line.length);
	
	var result = /^ (.*?) \((.*?):(\d*):(\d*)\)/.exec(clean);
	
	// If nothing was found, it's probably an anonymous function
	if (!result) {
		var temp = /(.*?):(\d*):(\d*)/.exec(clean);
		
		result = ['', 'anonymous', temp[1], temp[2], temp[3]];
	}
	
	obj.name = result[1];
	obj.path = result[2];
	obj.file = obj.path.split('/').pop();
	obj.line = result[3];
	obj.char = result[4];

	return obj;
}

/**
 * Get info on the caller: what name it has.
 * Unnamed functions return empty strings.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {integer}   level   Skip x many callers
 *
 * @returns {string}    The function name
 */
function getCallerName (level) {
	
	if (typeof level == 'undefined') level = 0;
	
	var caller = arguments.callee.caller;
	
	while (level) {
		if (typeof caller.arguments != 'undefined' && typeof caller.arguments.callee != 'undefined') {
			caller = caller.arguments.callee.caller;
		}
		level--;
	}
	
	return caller.name;
}

/**
 * Log messages, level 2: info
 *
 * Level 0 = error
 * Level 1 = warn
 * Level 2 = info
 * Level 3 = debug
 * Level 4 = verbose
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var log = global.log = function log (level, message, obj) {
	
	// Write the label to the console, without a trailing newline
	process.stdout.write(_logLabels[level]);
	
	var args = Array.prototype.slice.call(arguments, 0);
	
	// Remove the first argument
	args.shift();
	
	var needReturn = false, prevObj = false;
	
	// Print out every argument, using console.log for objects or
	// process.stdout for strings
	for (var i = 0; i < args.length; i++) {
		
		// If we printed an object previously, re-add a prefix
		if (prevObj) {
			process.stdout.write(_logLabels[level] + ' [...] ');
		}
		
		if (typeof args[i] == 'object') {
			console.log(args[i]);
			needReturn = false;
			prevObj = true;
		} else if (typeof args[i] == 'string') {
			process.stdout.write(args[i]);
			needReturn = true;
			prevObj = false;
		}
	}
	
	// If the last print out did not leave a return, add one ourselves
	if (needReturn) process.stdout.write('\n');
}

/**
 * Log messages, level 0: error
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   message   The message to print
 * @param    {object}   options   Extra options
 */
log.error = function error (message, options) {
	
	if (alchemy._settings.config.logLevel < 0 && alchemy._settings.config.logLevel != null) return;
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.stack == 'undefined') options.stack = false;
	
	var trace = '';
	
	if (alchemy._settings.config.logTrace || alchemy._settings.config.logTraceError === true || options.stack === true) {
		if (typeof options.level == 'undefined') options.level = 0;
		var callerInfo = getCallerInfo(options.level);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}
	
	return log('error', trace, message);
}

/**
 * Log messages, level 1: warning
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   message   The message to print
 * @param    {object}   options   Extra options
 */
log.warn = function warn (message, options) {
	
	if (alchemy._settings.config.logLevel < 1 && alchemy._settings.config.logLevel != null) return;
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.stack == 'undefined') options.stack = false;
	
	var trace = '';
	
	if (alchemy._settings.config.logTrace || alchemy._settings.config.logTraceWarn === true || options.stack === true) {
		if (typeof options.level == 'undefined') options.level = 0;
		var callerInfo = getCallerInfo(options.level);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}
	
	return log('warn', trace, message);
}

/**
 * Log messages, level 2: info
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   message   The message to print
 * @param    {object}   options   Extra options
 */
log.info = function info (message, options) {
	
	if (alchemy._settings.config.logLevel < 2 && alchemy._settings.config.logLevel != null) return;
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.stack == 'undefined') options.stack = false;
	
	var trace = '';
	
	if (alchemy._settings.config.logTrace || alchemy._settings.config.logTraceInfo === true || options.stack === true) {
		if (typeof options.level == 'undefined') options.level = 0;
		var callerInfo = getCallerInfo(options.level);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}
	
	return log('info', trace, message);
}

/**
 * Log messages, level 3: debug
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   message   The message to print
 * @param    {object}   options   Extra options
 */
log.debug = function debug (message, options) {
	
	if (alchemy._settings.config.logLevel < 3 && alchemy._settings.config.logLevel != null) return;
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.stack == 'undefined') options.stack = false;
	
	var trace = '';
	
	if (alchemy._settings.config.logTrace || alchemy._settings.config.logTraceDebug === true || options.stack === true) {
		if (typeof options.level == 'undefined') options.level = 0;
		var callerInfo = getCallerInfo(options.level);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}
	
	return log('debug', trace, message);
}

/**
 * Log messages, level 4: verbose
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   message   The message to print
 * @param    {object}   options   Extra options
 */
log.verbose = function verbose (message, options) {
	
	if (alchemy._settings.config.logLevel < 4 && alchemy._settings.config.logLevel != null) return;
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.stack == 'undefined') options.stack = false;
	
	var trace = '';
	
	if (alchemy._settings.config.logTrace || alchemy._settings.config.logTraceVerbose === true || options.stack === true) {
		if (typeof options.level == 'undefined') options.level = 0;
		var callerInfo = getCallerInfo(options.level);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}
	
	return log('verbose', trace, message);
}

/**
 * Pretty print debug option, wrapper for log.debug
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
global.pr = function pr (message) {
	return log.debug(message, {level: 1});
}