/**
 * The alchemy global, where everything will be stored
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {Alchemy}
 */
DEFINE('alchemy', new Alchemy());

/**
 * Define the log function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {Function}
 */
DEFINE('log', alchemy.log);

for (let key in alchemy.Janeway.LEVELS) {
	let name = key.toLowerCase();
	let val = alchemy.Janeway.LEVELS[key];

	log[name] = function(...args) {
		return alchemy.printLog(val, args, {level: 2});
	};
}

log.warn = log.warning;

/**
 * Define the todo log function
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {Function}
 */
log.todo = function todo(...args) {

	var options = {
		gutter: alchemy.Janeway.esc(91) + '\u2620 Todo:' + alchemy.Janeway.esc(39),
		level: 2
	};

	return alchemy.printLog(alchemy.TODO, args, options);
};