module.exports = function AlchemyColourSlider(Hawkejs, Blast) {

	/**
	 * The Colour Slider element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Slider = Function.inherits('Hawkejs.Element', function ColourSlider() {
		ColourSlider.super.call(this);

		// Get the handle
		this.handle_element = this.grab('div', 'handle');
		this.handle_element.setAttribute('draggable', 'true');

		// Get the colour dimension
		this.dimension = this.getAttribute('data-colour-dimension') || 'hue';

		if (this.dimension == 'hue') {
			this.max_value = 65535;
		} else {
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

			that._setHandlePosition(x_pos, true);
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
			that._setHandlePosition(x_pos, true);
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
	 */
	Slider.setMethod(function _setHandlePosition(x_pos, emit_event) {

		var max_width,
		    value,
		    event;

		// Always recalculate the max allowed width
		max_width = this.clientWidth - this.handle_element.clientWidth;

		// Don't go out of bounds
		if (x_pos < 0 || x_pos > max_width) {
			return;
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
	});

	/**
	 * Set the background
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Slider.setMethod(function setBackground() {

		var saturation,
		    luminosity,
		    alpha,
		    style,
		    hues,
		    i;

		saturation = 100;
		luminosity = 50;
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

				hues += 'hsla(' + this.current_hue + ',';

				switch (this.dimension) {

					case 'saturation':
						hues += (i * 20) + '%,' + luminosity + '%,' + alpha;
						break;

					case 'brightness':
						hues += 0 + '%,' + (i * 20) + '%,' + alpha;
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
	});

	Slider.monitor('control_config', function gotControlConfig(a) {
		console.log('Got control config:', a);
	})
};