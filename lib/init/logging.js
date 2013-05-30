var util = require('util');

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
	
	// Set the stacktracelimit, we don't need anything above the wanted level
	Error.stackTraceLimit = 1 + level;
	
	var err = (new Error);
	
	// Now reset the stacktracelimit to its default
	Error.stackTraceLimit = 10;
	
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
	
	if (typeof options == 'undefined') options = {}
	if (typeof options.force == 'undefined') options.force = false;
	
	if (!options.force && alchemy._settings.config.logLevel < 0 && alchemy._settings.config.logLevel != null) return false;
	
	if (typeof options.stack == 'undefined') options.stack = false;
	
	var trace = '';
	
	if (alchemy._settings.config.logTrace || alchemy._settings.config.logTraceError === true || options.stack === true) {
		if (typeof options.level == 'undefined') options.level = 0;
		var callerInfo = getCallerInfo(options.level);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}
	
	if (typeof message == 'string') message = message.red;
	
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
 * The log stream express can use
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
log.expressStream = {
	write: function expressStream (message, encoding){
		log.verbose(message);
	}
};

/**
 * Something to grab attention
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
log.attn = function attn (message) {
	
	message = message+'';
	
	pr('>>>>>>>>>>>>>>>>>\n\n');
	pr(message.bold.blue);
	pr('<<<<<<<<<<<<<<<<<\n\n');
}

/**
 * Pretty print debug option, wrapper for log.debug
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
global.pr = function pr (message) {
	message = util.inspect(message, false, null);
	return log.debug(message, {level: 1});
}

global.die = function die (message) {
	log.error(message, {level: 1, force: true});
	process.exit();
}