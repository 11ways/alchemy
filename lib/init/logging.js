var util          = require('util'),
    STR_PAD_LEFT  = 1,
    STR_PAD_RIGHT = 2,
    STR_PAD_BOTH  = 3,
    consoleWidth  = process.stdout.columns,
    consoleHeight = process.stdout.rows;

// Listen to console resized
process.stdout.on('resize', function() {
	consoleWidth  = process.stdout.columns,
	consoleHeight = process.stdout.rows;
});

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
 * @param   {Integer}   level   Skip x many callers
 *
 * @returns {Object}    An object contain caller info
 */
function getCallerInfo (level, err) {

	var key;

	if (err && err.type === 'callerInfo') {

		// Shallow clone the object
		err = alchemy.inject({}, err);

		if (typeof err.level !== 'undefined') {
			for (key in err.stack[err.level]) {
				err[key] = err.stack[err.level][key];
			}
		}

		return err;
	}
	
	if (typeof level === 'undefined') level = 0;
	
	level += 3;
	
	if (!err || !err.stack) {
		// Set the stacktracelimit, we don't need anything above the wanted level
		Error.stackTraceLimit = 1 + level;

		err = (new Error);

		// Now reset the stacktracelimit to its default
		Error.stackTraceLimit = 10;
	}

	// Turn the stack string into an array
	var ar = err.stack.split('\n');
	
	// Get the caller line
	var caller_line = ar[level];
	
	if (!caller_line) {
		caller_line = ar[ar.length-1];
	}

	var obj = extractLineInfo(caller_line);
	obj.text = err.stack;

	obj.stack = [];

	var copy = ar.splice(0);

	// Remove the first entry in the array
	copy.shift();

	for (var i = 0; i < copy.length; i++) {
		obj.stack.push(extractLineInfo(copy[i]));
	}

	obj.err = err;
	obj.message = err.message;
	obj.name = err.name;
	obj.type = 'callerInfo';

	return obj;
}

/**
 * Extract info from a single stack line
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   caller_line   The string
 *
 * @return  {Object}   An object containing the info
 */
function extractLineInfo(caller_line) {

	// Get the index
	var index = caller_line.indexOf('at ');
	
	// Get the error line, without the '  at ' part
	var clean = caller_line.slice(index+2, caller_line.length);
	
	var result = /^ (.*?) \((.*?):(\d*):(\d*)\)/.exec(clean);
	
	// If nothing was found, it's probably an anonymous function
	if (!result) {
		var temp = /(.*?):(\d*):(\d*)/.exec(clean);

		if (!temp) {
			temp = ['unknown', 'unknown', 'unknown', 'unknown'];
		}
		
		result = ['', 'anonymous', temp[1], temp[2], temp[3]];
	}

	return {
		name: result[1],
		path: result[2],
		file: result[2].split('/').pop(),
		line: result[3],
		char: result[4]
	};
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

var multiply = function multiply(text, amount) {
	var i, result = '';

	for (i = 0; i < amount; i++) {
		result += text;
	}

	return result;
};

function stripcolorcodes(strWithColors){
	return strWithColors.replace(/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g, '');
}

var indent = function indent(text, skipText, skipFirstLine) {

	var lines        = text.split('\n'),
	    visibleCount = stripcolorcodes(skipText).length,
	    hiddenCount  = skipText.length,
	    difference   = hiddenCount - visibleCount,
	    maxWidth,
	    uselength,
	    lineNr,
	    line,
	    length,
	    hiddenLength,
	    visibleLength,
	    result;

	if (typeof skipFirstLine === 'undefined') skipFirstLine = true;
	if (skipFirstLine) {
		skipFirstLine = 1;
	} else {
		skipFirstLine = 0;
	}

	for (i = 0; i < lines.length; i++) {
		
		if (i == 0 && skipFirstLine){
			maxWidth = consoleWidth + difference;
		} else {
			lines[i] = multiply(' ', visibleCount) + lines[i];
			maxWidth = consoleWidth;
		}

		line = lines[i];

		hiddenLength = line.length;
		visibleLength = stripcolorcodes(line).length;

		if (visibleLength > consoleWidth) {
			lines[i] = line.substring(0, maxWidth) + '\n' + multiply(' ', visibleCount) + line.substring(maxWidth);
		}
	}

	return lines.join('\n');
};

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
var log = global.log = function log (options, message, obj) {

	var args         = Array.prototype.slice.call(arguments, 0),
	    needReturn   = false,
	    prevObj      = false,
	    logLevel     = options.logLevel || 0,
	    level        = options.level || 0,
	    name         = options.name,
	    output,
	    callerInfo,
	    trace,
	    i;

	// If an error is supplied, we don't need to skip the first line later
	if (options.err) {
		level -= 3;
	}

	if (typeof options.force == 'undefined') options.force = false;

	if (!options.force && alchemy.settings && alchemy.settings.config.logLevel < logLevel && alchemy.settings.config.logLevel != null) return false;

	if (typeof options.stack == 'undefined') options.stack = false;

	if (!alchemy.settings || (alchemy.settings.config.logTrace ||
	    alchemy.settings.config['logTrace' + name.capitalize()] === true ||
	    options.stack === true)) {

		callerInfo = getCallerInfo(level, options.err);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}

	if (trace) {
		trace = _logLabels[name].bold + trace;
	} else {
		trace = _logLabels[name].bold;
	}

	if (options.colorize) {
		trace += options.colorize;
	}
	
	// Write the label to the console, without a trailing newline
	output = trace;

	// Remove the first argument
	args.shift();
	
	for (i = 0; i < args.length; i++) {
		
		if (args[i] && typeof args[i] != 'string') {
			args[i] = util.inspect(args[i], false, null);
		}

		if (typeof args[i] == 'object') {
			output += args[i];
			needReturn = false;
			prevObj = true;
		} else if (typeof args[i] == 'string') {
			output += args[i];
			needReturn = true;
			prevObj = false;
		}
	}

	output = indent(output, trace) + '\n';

	if (callerInfo) {
		if (callerInfo.message) {
			output = indent(output + callerInfo.name + ': ' + callerInfo.message, trace) + '\n';
		}
	}

	process.stdout.write(output);

	if (options.extra) {
		console.log(callerInfo.text);
	}
};

log.stack = function log_stack(amount) {

	if (typeof amount != 'number') {
		amount = 5;
	}

	var stack = getCallerInfo(amount);

	// Remove the first 2 entries
	stack.stack.shift();
	stack.stack.shift();

	log.debug(stack, {level: 2});
}

var l = function(level, logname, message, options) {

	var trace = '', callerInfo;

	if (typeof options == 'undefined') options = {};
	
	if (alchemy.settings.config.logTrace ||
	    alchemy.settings.config[logname] === true ||
	    options.stack === true) {

		if (typeof options.level == 'undefined') options.level = 0;
		callerInfo = getCallerInfo(options.level, options.err);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}

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
log.error = function error(message, options) {
	
	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Colour the message red if it's a string
	if (typeof message == 'string') message = message.red;

	// Add log options
	options.name = 'error';
	options.logLevel = 0;

	if (typeof options.level === 'undefined') {
		options.level = 1;
	}
	
	return log(options, message);
};

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
log.warn = function warn(message, options) {

	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Add log options
	options.name = 'warn';
	options.logLevel = 1;
	
	return log(options, message);
};

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
log.info = function info(message, options) {

	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Add log options
	options.name = 'info';
	options.logLevel = 2;
	
	return log(options, message);
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
log.debug = function debug(message, options) {
	
	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Add log options
	options.name = 'debug';
	options.logLevel = 3;
	
	return log(options, message);
};

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
	
	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Add log options
	options.name = 'verbose';
	options.logLevel = 4;

	if (!options.level) options.level = 1;
	
	return log(options, message);
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
		if (alchemy.settings.config.logHttp !== false) log.verbose(message);
	}
};

/**
 * Something to grab attention
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
log.attn = function attn(message, options) {
	
	console.log('\n\n');
	log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'.yellow.bold, options);
	log.debug(message, {colorize: '\x1B[1m\x1B[34m', level: options.level});
	log.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n'.yellow.bold, options);
};

log.getCallerInfo = getCallerInfo;
log.extractLineInfo = extractLineInfo;

/**
 * Pretty print debug option, wrapper for log.debug
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
global.pr = function pr(message, attn) {
	if (attn) {
		return log.attn(message, {level: 3});
	} else {
		return log.debug(message, {level: 2});
	}
};

/**
 * Print out the keys inside an object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
log.keys = function logKeys (object) {
	pr('>>>>>>>> Logging Keys: ')
	for (var name in object) {
		pr('Keyname: "' + name + '"');
	}
	pr('<<<<<<<<')
}

global.die = function die (message) {
	log.error(message, {level: 2, force: true});
	process.exit();
}

/**
 * Give Errors the ability to create a JSON object
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Error.prototype.toJSON = function toJSON() {
	return {
		error: true,
		arguments: this.arguments,
		type: this.type,
		message: this.message,
		stack: this.stack
	};
};
