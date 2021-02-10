define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on",
	"dojo/_base/array", "dojo/dom-construct", "dojo/dom-style",
	"dijit/Dialog",
	"dojox/form/CheckedMultiSelect", "dojo/data/ItemFileReadStore",
	"dojox/grid/DataGrid", "dojox/data/AndOrReadStore",
	"dojo/domReady!"
], function(
	declare, lang, on,
	array, domConstruct, domStyle,
	Dialog,
	CheckedMultiSelect, ItemFileReadStore,
	DataGrid, AndOrReadStore
){
	return declare(null, {
		divId: null,
		grid: null,
		gridCount: null,
		filterField: null,
		uniqueValues: null,
		query: "",
		filterDialog: null,
		searchFields: null,
		singleListFields: null,
		complexListFields: null,
		numberFields: null,
		constructor: function(params) {
			this.divId = params.divId;
			this.uniqueValues = params.uniqueValues;
			this.searchFields = params.searchFields;
			this.singleListFields = params.singleListFields;
			this.complexListFields = params.complexListFields;
			this.numberFields = params.numberFields;
			this.createTable();
			this.createFilterDialog();
		},

		createTable: function() {
			on(dojo.byId(this.divId + "_clearFilter"), "click", lang.hitch(this, function() {
				this.resetFilter();
			}));

			this.grid = new DataGrid({
				style: "width: 100%; height: 600px;",
        queryOptions: {
					ignoreCase: true
				},
				onHeaderCellClick: lang.hitch(this, function(e) {
					this.filterField = e.cell.field;
					this.addFilterDialogContent(e.cellIndex, e.cell.name, e.clientX, e.clientY);
        })
    	});
			this.grid.placeAt(dojo.byId(this.divId));
    	this.grid.startup();
		},

		resetFilter: function() {
			let f = {};
			f[this.filterField] = "*";
			this.grid.filter(f);
			this.query = "";
			domStyle.set(dojo.byId(this.divId + "_message"), "display", "none");
			domStyle.set(dojo.byId(this.divId + "_clearFilter"), "display", "none");
		},

		changeLayout: function(layout) {
			this.grid.setStructure(layout);
		},

		setGridData: function(data) {
			this.gridCount = data.length;
			let tableData = {
	    	identifier: 'id',
	    	label: 'id',
	    	items: []
			};

			let records = [];
			for(var property in this.uniqueValues) {
				this.uniqueValues[property] = [];
			}
			array.forEach(data, lang.hitch(this, function(feature) {
				records.push(feature);
				for(var property in this.uniqueValues) {
					if (this.complexListFields.includes(property)) {
						if (feature[property]) {
							let vals = feature[property].split(";");
							array.forEach(vals, lang.hitch(this, function(val) {
								if (!this.uniqueValues[property].includes(val)) {
									this.uniqueValues[property].push(val);
								}
							}));
						}
					}
					else {
						if (!this.uniqueValues[property].includes(feature[property])) {
							this.uniqueValues[property].push(feature[property]);
						}
					}
				}
			}));

			let i, len;
			for (i=0, len = records.length; i < len; ++i) {
				tableData.items.push(lang.mixin({ id: i+1 }, records[i%len]));
			}
			let store = new AndOrReadStore({data: tableData});
			this.grid.setStore(store);
		},

		createFilterDialog: function() {
			this.filterDialog = new Dialog({
				style: "max-height: 300px;"
			});
		},

		addFilterDialogContent: function(index, alias, x, y) {
			this.filterDialog.set("title", "Sort/filter table");
			domConstruct.empty(this.filterDialog.containerNode);
			let sortAscButton = domConstruct.create("div", { "innerHTML": "Sort ascending by " + alias, "class": "mainLink" }, this.filterDialog.containerNode, "last");
			let sortDscButton = domConstruct.create("div", { "innerHTML": "Sort descending by " + alias, "class": "mainLink" }, this.filterDialog.containerNode, "last");
			on(sortAscButton, "click", lang.hitch(this, function() {
				this.grid.setSortIndex(index, true);
				this.grid.sort();
				this.filterDialog.hide();
			}));
			on(sortDscButton, "click", lang.hitch(this, function() {
				this.grid.setSortIndex(index, false);
				this.grid.sort();
				this.filterDialog.hide();
			}));

			let buttons = null;
			if ((this.filterField != "view") && (this.filterField != "edit") && (this.filterField != "delete") && (this.filterField != "national_assessment")) {
				if (this.searchFields.includes(this.filterField)) {
					domConstruct.create("div", {"innerHTML": "Search in " + alias, "style": "margin-top: 10px;"}, this.filterDialog.containerNode, "last");
					let nameInput = domConstruct.create("input", {"type": "text", "style": "width: 90%;"}, this.filterDialog.containerNode, "last");
					buttons = domConstruct.create("div", {"style": "margin-top: 5px;"}, this.filterDialog.containerNode, "last");
					let nameSearchButton = domConstruct.create("span", { "innerHTML": "Search", "class": "mainLink" }, buttons, "last");
					on(nameSearchButton, "click", lang.hitch(this, function() {
						if (nameInput.value.length > 0) {
							this.query = "";
							let f = {};

							f[this.filterField] = "*"+ nameInput.value + "*";
							this.query = this.filterField + ": '*" + nameInput.value + "*'";
							this.grid.filter(f);
							document.getElementById(this.divId + "_message").innerHTML = "Showing " + this.grid.rowCount + " out of " + this.gridCount + " table rows (filter applied: Action = " + f[this.filterField] + ")";
							domStyle.set(dojo.byId(this.divId + "_message"), "display", "block");
							domStyle.set(dojo.byId(this.divId + "_clearFilter"), "display", "block");
						}
						this.filterDialog.hide();
					}));
				}
				else {
					domConstruct.create("div", {"innerHTML": "Filter by " + alias, "style": "margin-top: 10px;"}, this.filterDialog.containerNode, "last");
					let filterContainer = domConstruct.create("div", {}, this.filterDialog.containerNode, "last");
					var options = {
						identifier: "value",
						label: "label",
						items: []
					};
					array.forEach(this.uniqueValues[this.filterField].sort(), lang.hitch(this, function(val) {
						options.items.push({value: val, label: val});
					}));
					var optionStore = new ItemFileReadStore({
						data: options
					});
					let optionsMultiSelect = new CheckedMultiSelect ({
						dropDown: false,
						multiple: true,
						store: optionStore,
						style : {"margin": "10px", "max-width": "200px"}
					}, filterContainer);

					buttons = domConstruct.create("div", {"style": "margin-top: 5px; margin-bottom: 20px;"}, this.filterDialog.containerNode, "last");
					let filterButton = domConstruct.create("span", {"innerHTML": "Filter", "class": "mainLink", "style": "float: left;"}, buttons, "last");
					on(filterButton, "click", lang.hitch(this, function() {
						if (optionsMultiSelect.get("value").length > 0) {
							this.query = "";
							let m = alias + " = ";

							if (this.singleListFields.includes(this.filterField)) {
								array.forEach(optionsMultiSelect.get("value"), lang.hitch(this, function(val) {
									this.query = this.query + this.filterField + ": '" + val + "' OR ";
									m = m + val + " | ";
								}));
							}
							else if (this.complexListFields.includes(this.filterField)) {
								array.forEach(optionsMultiSelect.get("value"), lang.hitch(this, function(val) {
									this.query = this.query + this.filterField + ": '*" + val + "*' OR ";
									m = m + val + " | ";
								}));
							}
							this.query = this.query.slice(0, -4);
							m = m.slice(0, -2);

							this.grid.filter({complexQuery: this.query});
							document.getElementById(this.divId + "_message").innerHTML = "Showing " + this.grid.rowCount + " out of " + this.gridCount + " table rows (filter applied: "+ m + ")";
							domStyle.set(dojo.byId(this.divId + "_message"), "display", "block");
							domStyle.set(dojo.byId(this.divId + "_clearFilter"), "display", "block");
						}
						this.filterDialog.hide();
					}));
				}
				let closeDialogButton = domConstruct.create("span", {"innerHTML": "Close", "class": "mainLink", "style": "float: right;"}, buttons, "last");
				on(closeDialogButton, "click", lang.hitch(this, function() {
					this.filterDialog.hide();
				}));
				this.showFilterDialog(x, y);
			}
		},

		showFilterDialog: function(x, y) {
			this.filterDialog.show();
			let d = 0;
			if (this.filterDialog.domNode.clientHeight >= y) {
				d = this.filterDialog.domNode.clientHeight - y;
			}
			dojo.style(this.filterDialog.domNode, "top", y - this.filterDialog.domNode.clientHeight + d + "px");
			//dojo.style(this.filterDialog.domNode, "left", x - this.filterDialog.domNode.clientWidth - 20 + "px");
			dojo.style(this.filterDialog.domNode, "left", x + 20 + "px");
		},

		addPopupDialogContent: function(data) {
			this.popupDialog.set("title", "Action information");
			domConstruct.empty(this.popupDialog.containerNode);
			domConstruct.create("div", { "innerHTML": data.name[0], "class": "popupHeading1"}, this.popupDialog.containerNode, "last");
			domConstruct.create("div", { "innerHTML": "Level of implementation", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.implementation_name[0]) {
				domConstruct.create("div", { "innerHTML": data.implementation_name[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Segment", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.segment_name[0]) {
				domConstruct.create("div", { "innerHTML": data.segment_name[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Target year", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.target_year[0]) {
				domConstruct.create("div", { "innerHTML": data.target_year[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Modified date", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.modified_date[0]) {
				domConstruct.create("div", { "innerHTML": data.modified_date[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Specification", "class": "popupHeading1", "style": "margin-top: 20px;"}, this.popupDialog.containerNode, "last");
			domConstruct.create("div", { "innerHTML": "Category of action", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.category_name[0]) {
				domConstruct.create("div", { "innerHTML": data.category_name[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Topic", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.topic_name[0]) {
				domConstruct.create("div", { "innerHTML": data.topic_name[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Pressures", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.pressure_names[0]) {
				domConstruct.create("div", { "innerHTML": data.pressure_names[0].split(";").join(";<br/>"), "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Activities", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.activity_names[0]) {
				domConstruct.create("div", { "innerHTML": data.activity_names[0].split(";").join(";<br/>"), "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Key type of action", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.ktm_names[0]) {
				domConstruct.create("div", { "innerHTML": data.ktm_names[0].split(";").join(";<br/>"), "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Background", "class": "popupHeading1", "style": "margin-top: 20px;"}, this.popupDialog.containerNode, "last");
			domConstruct.create("div", { "innerHTML": "Origin", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.origin_name[0]) {
				domConstruct.create("div", { "innerHTML": data.origin_name[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Identifier", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.identifier[0]) {
				domConstruct.create("div", { "innerHTML": data.identifier[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Working groups", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.working_group_names[0]) {
				domConstruct.create("div", { "innerHTML": data.working_group_names[0].split(";").join(";<br/>"), "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Legacy", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.legacy[0]) {
				domConstruct.create("div", { "innerHTML": data.legacy[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Implementation", "class": "popupHeading1", "style": "margin-top: 20px;"}, this.popupDialog.containerNode, "last");
			domConstruct.create("div", { "innerHTML": "Relevant countries", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.country_names[0]) {
				domConstruct.create("div", { "innerHTML": data.country_names[0].split(";").join("; "), "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Assessment criteria: Accomplished", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.accomplished_criteria[0]) {
				domConstruct.create("div", { "innerHTML": data.accomplished_criteria[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Assessment criteria: Partly accomplished", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.partly_accomplished_criteria[0]) {
				domConstruct.create("div", { "innerHTML": data.partly_accomplished_criteria[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Assessment criteria: Not accomplished", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.not_accomplished_criteria[0]) {
				domConstruct.create("div", { "innerHTML": data.not_accomplished_criteria[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Regional assessment", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.regional_assessment_name[0]) {
				domConstruct.create("div", { "innerHTML": data.regional_assessment_name[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			domConstruct.create("div", { "innerHTML": "Supporting information: regional assessment", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
			if (data.regional_assessment_information[0]) {
				domConstruct.create("div", { "innerHTML": data.regional_assessment_information[0], "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}
			else {
				domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
			}

			let c = ["Denmark", "Estonia", "Finland", "Germany", "Latvia", "Lithuania", "Poland", "Russia", "Sweden"];
			array.forEach(this.assessmentData, lang.hitch(this, function(assessmentFeature) {
				if (data.id[0] == assessmentFeature.action_id) {
					if (c.includes(assessmentFeature.country_name)) {
						domConstruct.create("div", { "innerHTML": assessmentFeature.country_name, "class": "popupHeading1", "style": "margin-top: 20px;"}, this.popupDialog.containerNode, "last");
						domConstruct.create("div", { "innerHTML": "National assessment", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
						if (assessmentFeature.national_assessment_name) {
							domConstruct.create("div", { "innerHTML": assessmentFeature.national_assessment_name, "class": "popupLabel"}, this.popupDialog.containerNode, "last");
						}
						else {
							domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
						}
						domConstruct.create("div", { "innerHTML": "Supporting information", "class": "popupHeading2"}, this.popupDialog.containerNode, "last");
						if (assessmentFeature.national_assessment_information) {
							domConstruct.create("div", { "innerHTML": assessmentFeature.national_assessment_information, "class": "popupLabel"}, this.popupDialog.containerNode, "last");
						}
						else {
							domConstruct.create("div", { "innerHTML": "—", "class": "popupLabel"}, this.popupDialog.containerNode, "last");
						}
					}
				}
			}));

			this.popupDialog.show();
		},

		getNationalAssessmentInfo: function(data) {
			this.assessmentDialog.set("title", "National assessment information");
			domConstruct.empty(this.assessmentDialog.containerNode);
			let popupContent = "National assessment for action <div style='font-weight: bold;'>" + data.name[0] + "</div><br/>";
			array.forEach(this.assessmentData, lang.hitch(this, function(feature) {
				if (data.id[0] == feature.action_id) {
					popupContent = popupContent + "<div><span style='text-decoration: underline;'>Country</span>: " + feature.country_name + "</div>";
					popupContent = popupContent + "<div><span style='text-decoration: underline;'>Assessment</span>: " + feature.national_assessment_name + "</div>";
					if (feature.national_assessment_information) {
						popupContent = popupContent + "<div><span style='text-decoration: underline;'>Assessment information</span>: " + feature.national_assessment_information + "</div>";
					}
					popupContent = popupContent + "<br/>";
				}
			}));
			this.assessmentDialog.set("content", popupContent);
			this.assessmentDialog.show();
		}
	});
});
