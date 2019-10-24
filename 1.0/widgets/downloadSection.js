define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo",
	"dojo/on",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/_base/array", "dojo/dom-construct",
	"app/js/utils",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"dojo/text!./templates/downloadSection.html"
], function(
	declare,
	lang,
	dojo,
	on,
	dom,
	domStyle,
	array, domConstruct,
	utils,
	_WidgetBase, _TemplatedMixin, template
){
	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		utils: null,

		constructor: function(params) {
			this.utils = new utils();
		},

		postCreate: function() {
			
		}
	});
});
