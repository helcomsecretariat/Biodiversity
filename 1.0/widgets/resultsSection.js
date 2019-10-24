define([
	"dojo/_base/declare",
	"dojo/_base/lang", "dojo/_base/fx",
	"dojo/_base/window",
	"dojo",
	"dojo/on",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/request",
	"dojo/_base/array", "dojo/dom-construct",  "dojo/query!css3",
	"dojox/validate/web",
	"dojo/store/Memory","dijit/tree/ObjectStoreModel", "dijit/Tree", "dijit/form/FilteringSelect",
	"dijit/form/CheckBox", "dijit/Tooltip",
	"dojox/widget/TitleGroup", "dijit/TitlePane",
	"dijit/layout/AccordionContainer", "dijit/layout/ContentPane", "dijit/form/Select",
	"app/js/utils",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"dojo/text!./templates/resultsSection.html"
], function(
	declare,
	lang, baseFx,
	win,
	dojo,
	on,
	dom,
	domStyle,
	request,
	array, domConstruct, query,
	validate,
	Memory, ObjectStoreModel, Tree, FilteringSelect,
	checkBox, Tooltip,
	TitleGroup, TitlePane,
	AccordionContainer, ContentPane, Select,
	utils,
	_WidgetBase, _TemplatedMixin, template
){
	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		baseClass: "leftPanelSection",
		id: "resultsSection",
		style: "display: none",
		utils: null,
		map: null,

		constructor: function(params) {
			this.map = params.map;
			this.utils = new utils();
		},

		postCreate: function() {

		}
	});
});
