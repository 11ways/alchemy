var BaseClass = function BaseClass () {
	this.levelone = 'BaseClass';
	this._parent = {};
}

BaseClass.prototype.extend = function extend (extension) {
	
	var temp = function(){};
	
	temp.prototype = new this();
	
	for (var i in extension.prototype) {
		temp.prototype[i] = extension.prototype[i];
	}
	
	temp.prototype.constructor = extension;
	
}

alchemy.classes.BaseClass = BaseClass;