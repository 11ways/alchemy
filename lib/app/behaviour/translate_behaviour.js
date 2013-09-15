/**
 * The Translate Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Component
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Behaviour.extend(function TranslateBehaviour (){
	
	
	this.beforeFind = function beforeFind(next, options) {
		next();
	};
	
});