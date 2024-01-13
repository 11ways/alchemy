/**
 * The Breadcrumb class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.8
 * @version  1.3.8
 *
 * @param    {string}   input
 */
const Breadcrumb = Function.inherits('Alchemy.Base', function Breadcrumb(input) {

	this.trails = [];
	
	if (input) {
		this.addTrail(input);
	}
});

/**
 * Get the number of trails
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.8
 * @version  1.3.8
 *
 * @return   {number}
 */
Breadcrumb.setProperty(function length() {
	return this.trails.length;
});

/**
 * Add a breadcrumb trail
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.8
 * @version  1.3.8
 *
 * @param    {string}   input
 */
Breadcrumb.setMethod(function addTrail(input) {

	let trails;

	if (!input) {
		input = '';
	} else if (typeof input == 'object') {
		if (input instanceof Breadcrumb) {
			trails = input.trails;
		} else if (input.nodeType === 1) {
			// Simple way to see if it's an HTMLElement

			let element = input;
			input = '';

			let crumb = element.getAttribute('data-breadcrumb');

			if (crumb) {
				input = crumb;
			}

			crumb = element.getAttribute('data-breadcrumbs');

			if (crumb) {
				input += ' ' + crumb;
			}
		}
	}

	if (!trails) {
		// Split the string why whitespaces
		trails = input.trim().split(/\s+|\|+/);
	}

	if (trails?.length) {
		for (let trail of trails) {

			if (!trail) {
				continue;
			}

			// The trail has to end with a dot
			if (!trail.endsWith('.')) {
				trail += '.';
			}

			this.trails.push(trail);
		}
	}
});

/**
 * Do these 2 breadcrumbs match loosely?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.8
 * @version  1.3.8
 *
 * @param    {Alchemy.Breadcrumb}   other
 */
Breadcrumb.setMethod(function matches(other) {
	return this.matchLevel(other) > 0;
});

/**
 * What leven of match is there between these 2 breadcrumbs?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.8
 * @version  1.3.8
 *
 * @param    {Alchemy.Breadcrumb}   other
 *
 * @return   {number}   1 for a strict match, 2 for a loose match
 */
Breadcrumb.setMethod(function matchLevel(other) {

	if (!other || !this.trails.length) {
		return 0;
	}

	if (!(other instanceof Breadcrumb)) {
		other = new Breadcrumb(other);
	}

	let their_trail,
	    our_trail;
	
	for (our_trail of this.trails) {
		for (their_trail of other.trails) {
			// Strict matches are always true
			if (our_trail == their_trail) {
				return 1;
			}

			if (our_trail.startsWith(their_trail)) {
				return 2;
			}
		}
	}

	return 0;
});

/**
 * Turn it into a string
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.8
 * @version  1.3.8
 */
Breadcrumb.setMethod(function toString() {
	return this.trails.join(' ');
});