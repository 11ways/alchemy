var STR_PAD_LEFT  = 1,
    STR_PAD_RIGHT = 2,
    STR_PAD_BOTH  = 3,
    consoleWidth  = process.stdout.columns,
    consoleHeight = process.stdout.rows,
    Janeway,
    echo,
    ansi,
    key;

// Listen to console resized
process.stdout.on('resize', function onConsoleResize() {
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 */
GLOBAL.log = function log(options, message, obj) {

	if (!Array.isArray(message)) {
		message = [message];
	}

	if (Janeway != null) {
		Janeway.print('info', message, options);
	} else {
		console.log(message);
	}
};

log.stack = function log_stack(amount) {

	if (typeof amount != 'number') {
		amount = 5;
	}

	var stack = alchemy.Janeway.getCallerInfo(amount);

	// Remove the first 2 entries
	stack.stack.shift();
	stack.stack.shift();

	log.debug(stack, {level: 2});
}

var l = function(level, logname, message, options) {

	var trace = '', callerInfo;

	if (typeof options == 'undefined') options = {};
	
	if (alchemy.settings.log_trace ||
	    alchemy.settings[logname] === true ||
	    options.stack === true) {

		if (typeof options.level == 'undefined') options.level = 0;
		callerInfo = alchemy.Janeway.getCallerInfo(options.level, options.err);
		trace = '['.grey + callerInfo.file.bold + ':' + callerInfo.line.bold + ']'.grey;
		trace += ' ';
	}

}

/**
 * Log messages, level 0: error
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
		options.level = 2;
	}

	log(options, message);

	if (options.err) {

		stack = '';
		extra = '';

		top = '\n';
		top += '  ' + String(options.err.message).bold + '\n';
		top += '  Stacktrace using PATH_ROOT: '.bold + PATH_ROOT.yellow.bold;

		if (Janeway != null) {
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
		}

		if (broken) {
			top += '\n' + ('  Error with stack: ' + broken + ' garbage lines!').bold;
		}

		extra = top + '\n' + extra;

		if (ansi != null) {
			console.log(ansi.reset + ansi.bg.getRgb(3, 0, 0) + extra + ansi.reset);
		} else {
			console.log(extra);
		}
	}
};

/**
 * Todo messages
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

	if (!options.level) options.level = 2;

	return log.error(message, options);
};

/**
 * Log messages, level 1: warning
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

	if (!options.level) options.level = 2;

	return log(options, message);
};

/**
 * Log messages, level 2: info
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

	if (!options.level) options.level = 2;

	return log(options, message);
}

/**
 * Log messages, level 3: debug
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

	if (!options.level) options.level = 2;

	return log(options, message);
};

/**
 * Log messages, level 4: verbose
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

	if (!options.level) options.level = 2;

	return log(options, message);
}

/**
 * Something to grab attention
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 */
log.attn = function attn(message, options) {
	
	console.log('\n\n');
	log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'.yellow.bold, options);
	log.debug(message, {colorize: '\x1B[1m\x1B[34m', level: options.level});
	log.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n'.yellow.bold, options);
};

/**
 * Pretty print debug option, wrapper for log.debug
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
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

alchemy.use('colors');
Janeway = alchemy.use('janeway');
ansi = alchemy.use('ansi-256-colors')
alchemy.Janeway = Janeway;

log.getCallerInfo = Janeway.getCallerInfo;
log.extractLineInfo = Janeway.extractLineInfo;

// Start Janeway only if run inside a terminal
if (!Blast.isNW && process.stdout.isTTY && process.argv.indexOf('--disable-janeway') == -1) {

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