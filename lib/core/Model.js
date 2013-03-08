/**
 * The Base Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.08
 * @version  2013.03.08
 */
var BaseModel = alchemy.classes.BaseClass.extend(function(){
	
	this.leveltwo = 'BaseModel';
	
	this.blueprint = {};
	this.admin = {};
	this.schema = {};
	this.model = {};
	this.cache = {};
	this.index = {};
	this.many = {};
	this.special = {json: {}};
	
	this._prepost = {
		pre: [],
		post: []
	};
	
});

elric.classes.BaseModel = BaseModel;