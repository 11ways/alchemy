module.exports = function AlchemyColourSlider(Hawkejs, Blast) {

	/**
	 * The Colour Slider element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Slider = Function.inherits('Hawkejs.Element', function ColourSlider() {

		var that = this;

		ColourSlider.super.call(this);

		// Get the handle
		this.handle_element = this.grab('div', 'handle');
		this.handle_element.setAttribute('draggable', 'true');

		// Get the colour dimension
		this.dimension = this.getAttribute('data-colour-dimension') || 'hue';

		if (this.dimension == 'hue') {
			this.max_css_value = 360;
			this.max_value = 65535;
		} else {
			this.max_css_value = 100;
			this.max_value = 255;
		}

		// Hue for non-hue fields
		this.current_hue = 0;

		// Set the background
		this.setBackground();

		if (this.getAttribute('value')) {
			this._setHandleByValue(this.getAttribute('value'));
		}

		if (!Blast.isNode) {
			this.initListeners();

			Blast.setImmediate(function getNeighbours() {

				var siblings = that.parentElement.children,
				    sibling,
				    dim,
				    i;

				for (i = 0; i < siblings.length; i++) {
					sibling = siblings[i];

					if (sibling != that && sibling.nodeName == 'COLOUR-SLIDER') {
						// Get the colour dimension of the sibling
						dim = sibling.getAttribute('data-colour-dimension');

						if (!dim) {
							continue;
						}

						that['sibling_' + dim] = sibling;
					}
				}

				that.setBackground(true);
			});
		}
	});

	/**
	 * Return CSS content
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Slider.setStatic(function hawkejsCss() {

		var style = 'colour-slider {display:block;width:100px;height:20px;';
		style += 'position:relative;cursor:pointer;border-radius:10px;';
		style += 'box-shadow:rgba(255,255,255,0.1) 0 1px 2px 1px inset,rgba(255,255,255,0.2) 0 1px inset,rgba(0,0,0,0.4) 0 -1px 1px inset,rgba(0,0,0,0.4) 0 1px 1px,#999 0 0 1px 1px;';
		style += '}\n';

		style += 'colour-slider:hover .handle {background-color:rgba(255,255,255,0.1)}\n';

		style += 'colour-slider .handle {position:absolute;cursor:pointer;background-color:#ddd;';
		style += 'z-index:2;top:-1px;content:" ";width:22px;height:22px;border-radius:1rem;';
		style += 'background-image:-webkit-radial-gradient(top center, circle, rgba(255,255,255,0.9),rgba(255,255,255,0.2) 15px);';
		style += 'background-image:-moz-radial-gradient(top center, circle, rgba(255,255,255,0.9),rgba(255,255,255,0.2) 15px);';
		style += 'box-shadow:#fff 0px 1px 1px inset,rgba(0,0,0,0.4) 0px -1px 1px inset,rgba(0,0,0,0.4) 0px 1px 4px 0px,rgba(0,0,0,0.6) 0 0 2px';

		style += '}';

		return style;
	});

	/**
	 * Initialize event listeners
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Slider.setMethod(function initListeners() {

		var that = this,
		    start = 0,
		    start_left;

		// Listen to clicks on the element
		this.addEventListener('click', function onClick(e) {

			var x_pos = e.clientX - ~~(that.getClientRects()[0].left) - (that.handle_element.clientWidth / 2);

			that._setHandlePosition(x_pos, true, true);
		});

		// Listen for the drag to start
		this.handle_element.addEventListener('dragstart', function onClick(e) {
			var el;

			// Create a new dummy div
			el = document.createElement('div');

			// Set this dummy, empty div as the drag image
			// (so no "ghost image" is shown)
			e.dataTransfer.setDragImage(el, 0, 0);

			// Get the starting position
			start = e.screenX;
			start_left = (parseInt(window.getComputedStyle(that.handle_element).left) || 0);
		});

		// Execute when actually dragging the handle
		this.handle_element.addEventListener('drag', function onDrag(e) {
			var x_pos = (e.screenX - start) + start_left;

			// Last calculated x position is always smaller than 0 for some reason
			if (x_pos < 0) {
				return;
			}

			that._setHandlePosition(x_pos, true, true);
		}, false);
	});

	/**
	 * Set the handle based on the value
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Slider.setMethod(function _setHandleByValue(value, emit_event) {

		var max_width,
		    x_pos;

		// Always recalculate the max allowed width
		max_width = this.clientWidth - this.handle_element.clientWidth;

		// Calculate the position
		x_pos = ~~((value / this.max_value) * max_width);

		this._setHandlePosition(x_pos, emit_event);
	});

	/**
	 * Set the handle position and update the value
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Number}   x_pos        The x coordinate
	 * @param    {Boolean}  emit_event   If a change event needs to be emitted
	 * @param    {Boolean}  from_mpise   If this change came from the mouse
	 */
	Slider.setMethod(function _setHandlePosition(x_pos, emit_event, from_mouse) {

		var max_width,
		    value,
		    event;

		// Always recalculate the max allowed width
		max_width = this.clientWidth - this.handle_element.clientWidth;

		// Don't go out of bounds
		if (x_pos < 0 || x_pos > max_width) {
			if (from_mouse && x_pos < 0) {
				x_pos = 0;
			} else if (from_mouse && x_pos > max_width) {
				x_pos = max_width;
			} else {
				return;
			}
		}

		// Set the left position of the handle
		this.handle_element.style.left = x_pos + 'px';

		// Calculate the new HUE value
		value = this.max_value * (x_pos / max_width);

		// Set the element's value property
		this.value = ~~value;

		if (emit_event && typeof CustomEvent != 'undefined') {
			// Create a new event
			event = new CustomEvent('change');
			this.dispatchEvent(event);
		}

		this.setBackground(true);
	});

	/**
	 * Update siblings
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Slider.setMethod(function updateSiblings() {

		if (this.sibling_brightness) {
			this.sibling_brightness.setBackground(false);
		}

		if (this.sibling_hue) {
			this.sibling_hue.setBackground(false);
		}

		if (this.sibling_saturation) {
			this.sibling_saturation.setBackground(false);
		}
	});

	/**
	 * Set the background
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Boolean}   update_siblings
	 */
	Slider.setMethod(function setBackground(update_siblings) {

		var that = this,
		    has_brightness,
		    saturation,
		    luminosity,
		    brightness,
		    alpha,
		    style,
		    hues,
		    temp,
		    hue,
		    hsl,
		    i;

		// Get the saturation
		if (this.sibling_saturation) {
			saturation = Number(this.sibling_saturation.value);
		}

		// And luminosity or brightness
		if (this.sibling_luminosity) {
			luminosity = Number(this.sibling_luminosity.value);
		} else if (this.sibling_brightness) {
			brightness = Number(this.sibling_brightness.value);
		}

		// Get the current hue value
		if (this.sibling_hue) {
			this.current_hue = Number(this.sibling_hue.value);
		}

		// And store it in another variable, too
		hue = this.current_hue;

		// And recalculate for css
		hue = ~~((hue / 65535) * 360);
		saturation = (saturation / 255) * 100;

		// If brightness is set, we need to convert it to luminosity
		if (brightness != null) {
			has_brightness = true;
			brightness = (brightness / 255) * 100;

			hsl = this.convertHSBtoHSL(hue, saturation, brightness);

			hue = hsl.h;
			saturation = hsl.s;
			luminosity = hsl.l;
		} else {
			luminosity = (luminosity / 255) * 100;
		}

		if (isNaN(saturation)) {
			saturation = 100;
		}

		if (isNaN(luminosity)) {
			luminosity = 50;
		}

		if (isNaN(hue)) {
			hue = 0;
		}

		// Floor the values
		hue = ~~(hue * 100) / 100;
		saturation = ~~(saturation * 100) / 100;
		luminosity = ~~(luminosity * 100) / 100;

		alpha = 1;
		hues = '';

		if (this.dimension == 'hue') {
			for (i = 0; i < 37; i++) {

				if (hues) hues += ',';

				hues += 'hsla(' + (i * 10) + ',' + saturation + '%,' + luminosity + '%,' + alpha + ')';
			}
		} else {
			for (i = 0; i < 6; i++) {
				if (hues) hues += ',';

				hues += 'hsla(' + hue + ',';

				switch (this.dimension) {

					case 'saturation':

						// Saturation acts differently on HSB
						if (has_brightness) {
							temp = this.convertHSBtoHSL(hue, i * 20, brightness);
							hues += temp.s + '%,' + temp.l + '%,' + alpha;
						} else {
							hues += (i * 20) + '%,' + luminosity + '%,' + alpha;
						}
						break;

					case 'brightness':
						// Convert HSL to HSB
						temp = this.convertHSBtoHSL(hue, saturation, i * 20);
						hues += temp.s + '%,' + temp.l + '%,' + alpha;
						break;

					case 'luminosity':
						hues += saturation + '%,' + (i * 20) + '%,' + alpha;
						break;
				}

				hues += ')';
			}
		}

		style = 'background:-webkit-linear-gradient(left,' + hues + ');';
		style += 'background:-moz-linear-gradient(left,' + hues + ');';

		this.setAttribute('style', style);

		if (update_siblings) {
			Blast.setImmediate(function doSiblings() {
				that.updateSiblings();
			});
		}
	});

	/**
	 * Convert HSB/HSV to HSL
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Slider.setMethod(function convertHSBtoHSL(hue, saturation, brightness) {

		var lightness,
		    hsl;

		// determine the lightness in the range [0,100]
		lightness = (2 - saturation / 100) * brightness / 2;

		// store the HSL components
		hsl = {
			'h' : hue,
			's' : saturation * brightness / (lightness < 50 ? lightness * 2 : 200 - lightness * 2),
			'l' : lightness
		};

		// correct a division-by-zero error
		if (isNaN(hsl.s)) hsl.s = 0;

		return hsl;
	});

	Slider.monitor('control_config', function gotControlConfig(a) {
		console.log('Got control config:', a);
	})
};