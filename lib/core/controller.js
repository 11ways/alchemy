/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Controller = alchemy.classes.BaseClass.extend(function Controller (){
	
	// Use a model with this controller?
	this.useModel = true;
	
	// The main model for this controller
	this.Model = false;
	
	this.init = function init () {
		
		if (this.useModel === true && this.singular) {
			this.Model = Model.get(this.singular);
			this[this.singular.camelize()] = this.Model;
		}
		
	}
	
});

alchemy.classes.Controller = Controller;