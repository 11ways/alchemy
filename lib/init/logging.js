var util          = require('util'),
    STR_PAD_LEFT  = 1,
    STR_PAD_RIGHT = 2,
    STR_PAD_BOTH  = 3,
    consoleWidth  = process.stdout.columns,
    consoleHeight = process.stdout.rows,
    Janeway       = require('janeway'),
    echo,
    key;
require('colors');
ansi = require('ansi-256-colors')
alchemy.Janeway = Janeway;

// Listen to console resized
process.stdout.on('resize', function() {
	consoleWidth  = process.stdout.columns,
	consoleHeight = process.stdout.rows;
});


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
 * @version  1.0.0
 */
GLOBAL.log = function log(options, message, obj) {

	if (!Array.isArray(message)) {
		message = [message];
	}

	Janeway.print('info', message, options);
};

// Start Janeway only if run inside a terminal
if (process.stdout.isTTY) {
	Janeway.started = true;
	Janeway.start();

	echo = function echo(msg) {
		Janeway.print('info', Array.cast(arguments), {level: 4});
	};
} else {
	echo = function echo(msg) {
		process.stdout.write(msg);
	};
}

for (key in Janeway.LEVELS) {
	log[key] = Janeway.LEVELS[key];
}

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
 * @version  1.0.0
 *
 * @param    {string}   message   The message to print
 * @param    {object}   options   Extra options
 */
log.error = function error(message, options) {

	var broken = 0,
	    stack,
	    extra,
	    info,
	    temp,
	    top,
	    obj,
	    i;
	
	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Colour the message red if it's a string
	if (typeof message == 'string') message = message.red;

	// Add log options
	if (options.name == null) options.name = 'error';
	options.logLevel = 0;

	if (typeof options.level === 'undefined') {
		options.level = 1;
	}

	log(options, message);

	if (options.err) {

		stack = '';
		extra = '';

		top = '\n';
		top += '  Stacktrace using PATH_ROOT: '.bold + PATH_ROOT.yellow.bold;

		info = Janeway.getCallerInfo(0, options.err);

		for (i = 0; i < info.stack.length; i++) {

			obj = info.stack[i];
			temp = (obj.path || '').trim();

			if (obj.name == 'anonymous' && obj.path == 'unknown' && obj.line == 'unknown') {
				broken++;
				continue;
			}

			if (temp.startsWith(PATH_ROOT)) {
				temp = temp.slice(PATH_ROOT.length);
			}

			extra += '\n';
			extra += '  ' + 'Fnc'.bold.underline + ' ' + Number(obj.line||0).toPaddedString(3).bold + ' ' + obj.name.white  + '\n';
			extra += '  ' + '    ' + Number(obj.char||0).toPaddedString(3).bold + ' ' + temp.trim() + ' ' + '\n';
		}

		if (broken) {
			top += '\n' + ('  Error with stack: ' + broken + ' garbage lines!').bold;
		}

		extra = top + '\n' + extra;

		console.log(ansi.reset + ansi.bg.getRgb(3, 0, 0) + extra + ansi.reset);
	}
};

/**
 * Todo messages
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   message   The message to print
 * @param    {Object}   options   Extra options
 */
log.todo = function todo(message, options) {

	// Make sure the options var is an object
	if (typeof options == 'undefined') options = {};

	// Add log options
	options.name = 'todo';
	options.logLevel = 0;

	if (!options.level) options.level = 1;

	return log.error(message, options);
};

/**
 * Log messages, level 1: warning
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
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

	if (!options.level) options.level = 1;

	return log(options, message);
};

/**
 * Log messages, level 2: info
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
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

	if (!options.level) options.level = 1;

	return log(options, message);
}

/**
 * Log messages, level 3: debug
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
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

	if (!options.level) options.level = 1;

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

log.getCallerInfo = Janeway.getCallerInfo;
log.extractLineInfo = Janeway.extractLineInfo;

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