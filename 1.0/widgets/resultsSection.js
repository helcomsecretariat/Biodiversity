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
	"widgets/dataTable", "widgets/dataPopup",
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
	dataTable, dataPopup,
	_WidgetBase, _TemplatedMixin, template
){
	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		baseClass: "leftPanelSection",
		id: "resultsSection",
		style: "display: none",
		map: null,
		fields: null,
		resTable: null,
		resPopup: null,

		constructor: function(params) {
			this.map = params.map;
			this.fields = params.fields;
		},

		postCreate: function() {

		},
		createResultsTable: function() {

			if (!this.resPopup) {
				this.resPopup = new dataPopup();
			}

			let resTableLayout = [
				{
					noscroll: true,
					cells: [
						{ field: "scientific_name", name: "Scientific name", datatype: "string", width: "150px", formatter: this.createLink}
          ]
				},
				{
					cells: [
						{ field: "taxonomical_status", name: "Taxonomical status", datatype: "string", width: "auto"},
			    	{ field: "accepted_name", name: "Accepted name", datatype: "string", width: "auto"},
			    	{ field: "species_group", name: "Species group", datatype: "string", width: "auto"},
			    	{ field: "year_collected", name: "Year of collection", datatype: "string", width: "auto"}
					]
				}
			];

			let uniqueValues = {
				"taxonomical_status": [],
				"species_group": [],
				"year_collected": []
			};
			let searchFields = ["scientific_name", "accepted_name"];
			let singleListFields = ["taxonomical_status", "species_group", "year_collected"];
			let complexListFields = [];
			let numberFields = [];

			if (!this.resTable) {
				this.resTable = new dataTable({
					divId: "resultsDataGrid",
					uniqueValues: uniqueValues,
					searchFields: searchFields,
					singleListFields: singleListFields,
					complexListFields: complexListFields,
					numberFields: numberFields,
				});
			}
			this.resTable.changeLayout(resTableLayout);
			on(this.resTable.grid,"CellClick", lang.hitch(this, function(evt) {
				//if (evt.cell.field == "scientific_name") {
				//	console.log("cell", this.resTable.grid.selection.getSelected()[0]);
				if (evt.cell.field == "scientific_name") {
					let props = this.resTable.grid.selection.getSelected()[0];
					let data = {};
					for (var name in props) {
  					if ((props.hasOwnProperty(name)) && (!name.startsWith("_"))) {
							data[name] = props[name][0];
						}
					}
					let title = "Species observation information";
					if (data.scientific_name) {
						title = data.scientific_name + " - species observation information";
					}
					this.resPopup.showPopup(title, this.fields, data);
				}
			}));
		},
		createLink: function(data) {
			return ("<a href=#>"+data+"</a>");
		},
	});
});
