define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo",
	"dojo/on",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/_base/array",
	"dojo/store/Memory", "dijit/form/FilteringSelect",
	"dojox/form/CheckedMultiSelect", "dojo/data/ItemFileReadStore",
	"dijit/form/CheckBox",
	"dijit/TitlePane",
	"esri/request", "esri/tasks/query", "esri/tasks/QueryTask",
	"esri/toolbars/draw", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/Color", "esri/graphic",
	"esri/geometry/Extent", "esri/SpatialReference", "esri/graphicsUtils", "esri/InfoTemplate", "esri/layers/GraphicsLayer",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"dojo/text!./templates/searchSection.html"
], function(
	declare,
	lang,
	dojo,
	on,
	dom,
	domConstruct,
	array,
	Memory, FilteringSelect,
	CheckedMultiSelect, ItemFileReadStore,
	CheckBox,
	TitlePane,
	esriRequest, Query, QueryTask,
	Draw, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color, Graphic,
	Extent, SpatialReference, graphicsUtils, InfoTemplate, GraphicsLayer,
	_WidgetBase, _TemplatedMixin, template
){
	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		baseClass: "leftPanelSection",
		id: "searchSection",
		map: null,
		services: null,
		fields: null,
		resultSection: null,
		pointsQueryTask: null,
		grids5x5QueryTask: null,
		queryFilters: {
			extent: null,
			species_name: null,
			year1: "",
			year2: "",
			species_groups: null,
			institutions: null,
			collections: null
		},
		uniqueNames: null,
		uniqueGroups: null,
		uniqueInstitutions: null,
		speciesGroupMultiSelect: null,
		institutionsMultiSelect: null,
		collectionCodeMultiSelect: null,
		drawTool: null,
		extentSymbol: null,
		layers: [],
		noObservationsFoundCount: 0,
		obsForTable: [],
		pointsLayer: null,
		grid5x5Layer: null,
		pointSymbol: null,
		grid5x5Symbol: null,
		pointsFound: true,
		grid5x5Found: true,
		totalCountPoints: 0,
		totalCountGrid5x5: 0,
		downloadShpRequested: false,
		downloadUrls: {
			points: null,
			grid5x5: null,
		},
		mapDataReceived: {
			points: false,
			grid5x5: false,
		},
		uniqueDataReceived: {
			names: false,
			groups: false,
			institutions: false,
			collections: false,
		},
		constructor: function(params) {
			this.map = params.map;
			this.services = params.services;
			this.fields = params.fields;
			this.resultSection = params.resultSection;

			array.forEach(params.services.observations, lang.hitch(this, function(obsService) {
				if (obsService.inUse) {
					this.layers.push(obsService);
				}
			}));
		},

		postCreate: function() {
			var speciesGroupTp = new TitlePane({title:"Species group"});
	    this.speciesGroupSection.appendChild(speciesGroupTp.domNode);
    	speciesGroupTp.startup();

			var institutionTp = new TitlePane({title:"Institution/data provider"});
	    this.institutionSection.appendChild(institutionTp.domNode);
    	institutionTp.startup();

			var collectionCodeTp = new TitlePane({title:"Origin of data collection"});
	    this.collectionCodeSection.appendChild(collectionCodeTp.domNode);
    	collectionCodeTp.startup();

			this.getUniqueFilters(speciesGroupTp, institutionTp, collectionCodeTp);

			on(this.obsYear1Input, "change", lang.hitch(this, function() {
				this.queryFilters.year1 = this.obsYear1Input.value;
			}));
			on(this.obsYear2Input, "change", lang.hitch(this, function() {
				this.queryFilters.year2 = this.obsYear2Input.value;
			}));

			this.drawTool = new Draw(this.map);
			this.extentSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2),new Color([255,255,0,0.25]));
			on(this.drawExtentLink, "click", lang.hitch(this, function() {
				this.map.graphics.clear();
				this.map.disableMapNavigation();
        this.drawTool.activate("extent");
				this.cancelExtentLink.style.display = "inline";
			}));
			on(this.cancelExtentLink, "click", lang.hitch(this, function() {
				this.map.graphics.clear();
				this.drawTool.deactivate();
	      this.map.enableMapNavigation();
				this.cancelExtentLink.style.display = "none";
			}));
			on(this.drawTool, "draw-end", lang.hitch(this, function(evt) {
				this.map.graphics.add(new Graphic(evt.geometry, this.extentSymbol));
				this.drawTool.deactivate();
	      this.map.enableMapNavigation();
				this.cancelExtentLink.style.display = "none";
				this.convertCoordinates(evt.geometry);
			}));

			this.map.infoWindow.resize(400, 400);

			array.forEach(this.layers, lang.hitch(this, function(layer) {
				layer.queryTask = new QueryTask(layer.url);
				layer.featuresReceived = false;
				layer.featuresCount = 0;

				layer.infoTemplate = new InfoTemplate("${scientific_name}", null);
				layer.graphicsLayer = new GraphicsLayer();
				layer.graphicsLayer.setInfoTemplate(layer.infoTemplate);
				this.map.addLayer(layer.graphicsLayer);

				layer.symbol = null;
				if (layer.type == "point") {
					layer.symbol = new SimpleMarkerSymbol(
						SimpleMarkerSymbol.STYLE_CIRCLE,
						12,
						new SimpleLineSymbol(
							SimpleLineSymbol.STYLE_SOLID,
							new Color([0, 0, 0, 0.9]),
							1
						),
						new Color([0, 0, 0, 0.0])
					);
				}
				else if (layer.type == "polygon") {
					layer.symbol = new SimpleFillSymbol(
						SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(
							SimpleLineSymbol.STYLE_SOLID,
							new Color([0,0,0,0.9]),
							1
						),
						new Color([0,0,0,0.0])
					);
				}


				// construct result section for each layer
				layer.resultsDiv = domConstruct.create("div", {"style": "display: none; margin-top: 20px;"}, this.resultSection.results_container, "last");

				domConstruct.create("div", {"style": "font-size: 18px;", "innerHTML": layer.resultsTile}, layer.resultsDiv, "last");

				domConstruct.create("span", {"style": "font-size: 14px;", "innerHTML": "Total found:"}, layer.resultsDiv, "last");
				layer.featuresCountSpan = domConstruct.create("span", {"style": "color: #444444; font-size: 14px; margin-left: 10px;"}, layer.resultsDiv, "last");

				layer.switcher = domConstruct.create("div", {"style": "display: none; margin-top: 5px;"}, layer.resultsDiv, "last");
				var layerCheckbox = new CheckBox({checked: true});
				layerCheckbox.placeAt(layer.switcher, "first");
				on(layerCheckbox, "change", lang.hitch(this, function(checked) {
					if (checked) {
						layer.graphicsLayer.setVisibility(true);
					}
					else {
						layer.graphicsLayer.setVisibility(false);
					}
				}));
				domConstruct.create("span", {"style": "color: #444444; font-size: 14px;", "innerHTML": "Show on the map"}, layer.switcher, "last");
				layer.maxMessage = domConstruct.create("div", {"style": "display: none; color: #444444; font-size: 12px; margin-left: 20px;", "innerHTML": "10000 observations available for preview."}, layer.switcher, "last");

				layer.downloadButton = domConstruct.create("div", {"class": "downloadButton", "style": "display: none; margin-top: 5px;", "innerHTML": "Download Shapefile"}, layer.resultsDiv, "last");
				layer.downloadMaxMessage = domConstruct.create("div", {
					"style": "display: none; color: #444444; font-size: 12px; margin-left: 20px;",
					"innerHTML": "Search result dataset is too big to be extracted for download. Please, update your search in order to get downloadable dataset (&lt;100 000 observations) or alternatively download the whole observations dataset as <a href='http://metadata.helcom.fi/geonetwork/srv/eng/resources.get?uuid=16d893d7-f8a6-4e56-a440-8f68d187551a&fname=observations_final.gdb.zip&access=public'>ESRI Geodatabase (ZIP)</a>."
				}, layer.resultsDiv, "last");
				on(layer.downloadButton, "click", lang.hitch(this, function() {
					if (layer.featuresCount > 100000) {
						layer.downloadMaxMessage.style.display = "block";
					}
					else {
						this.downloadShapeFile(layer.name);
					}
				}));

			}));
		},

		getUniqueFilters: function(speciesGroupTp, institutionTp, collectionCodeTp) {

			var namesQueryTask = new QueryTask(this.services.unique_names);
			var groupsQueryTask = new QueryTask(this.services.unique_groups);
			var institutionsQueryTask = new QueryTask(this.services.unique_institutions);
			var collectionsQueryTask = new QueryTask(this.services.unique_collections);

			var query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "1=1";

			namesQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var names = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						names.push({name: feature.attributes.name, id: feature.attributes.name});
					}));

					var nameStore = new Memory({
						data: names
					});

					var speciesNameSelect = new FilteringSelect({
						id: "speciesNameInput",
						name: "speciesNameSearch",
						class: "searchInput",
						queryExpr: "*${0}*",
						autoComplete: false,
						required: false,
						forceWidth: true,
						hasDownArrow: false,
						placeHolder: "Species name",
						store: nameStore,
						searchAttr: "name",
						onChange: lang.hitch(this, function(value) {
							this.speciesNameStatusInfo.style.display = "none";
							this.speciesAcceptedNameInfo.style.display = "none";
							this.speciesNameStatus.innerHTML = "";
							this.speciesAcceptedName.innerHTML = "";
							if (value) {
								this.queryFilters.species_name = value;
								this.getSpeciesNameStatus(value);
							}
							else {
								this.queryFilters.species_name = null;
							}
						})
					}, this.speciesNameInput).startup();
					this.uniqueDataReceived.names = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
      	}),
      	lang.hitch(this, function (error) {
					this.uniqueDataReceived.names = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
					console.log(error);
					alert("Unable to get unique names. Contact server administrator.");
				})
      );

			groupsQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var groups = {
						identifier: "value",
						label: "label",
						items: []
					};
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						groups.items.push({value: feature.attributes.name, label: feature.attributes.name});
					}));
					var groupStore = new ItemFileReadStore({
						data: groups
					});

					this.speciesGroupMultiSelect = new CheckedMultiSelect ({
						id:"speciesGroupSearchInput",
						dropDown: false,
						multiple: true,
						store: groupStore,
						style : {width: "100%"},
						onChange: lang.hitch(this, function() {
							this.queryFilters.species_groups = this.speciesGroupMultiSelect.get("value");
						})
					}, speciesGroupTp.containerNode);
					this.uniqueDataReceived.groups = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
      	}),
      	lang.hitch(this, function (error) {
					this.uniqueDataReceived.groups = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
					console.log(error);
					alert("Unable to get unique groups. Contact server administrator.");
				})
      );

			institutionsQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var institutions = {
						identifier: "value",
						label: "label",
						items: []
					};
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						institutions.items.push({value: feature.attributes.source, label: feature.attributes.source});
					}));
					var institutionsStore = new ItemFileReadStore({
						data: institutions
					});

					this.institutionsMultiSelect = new CheckedMultiSelect ({
						id:"institutionsSearchInput",
						dropDown: false,
						multiple: true,
						store: institutionsStore,
						style : {width: "100%"},
						onChange: lang.hitch(this, function() {
							this.queryFilters.institutions = this.institutionsMultiSelect.get("value");
						})
					}, institutionTp.containerNode);

					this.uniqueDataReceived.institutions = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
      	}),
      	lang.hitch(this, function (error) {
					this.uniqueDataReceived.institutions = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
					console.log(error);
					alert("Unable to get unique institutions. Contact server administrator.");
				})
      );

			collectionsQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var collectionCodes = {
						identifier: "value",
						label: "label",
						items: []
					};

					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						collectionCodes.items.push({value: feature.attributes.origin, label: feature.attributes.origin});
					}));

					var collectionCodeStore = new ItemFileReadStore({
						data: collectionCodes
					});

					this.collectionCodeMultiSelect = new CheckedMultiSelect ({
						id:"collectionCodeSearchInput",
						dropDown: false,
						multiple: true,
						store: collectionCodeStore,
						style : {width: "100%"},
						onChange: lang.hitch(this, function() {
							this.queryFilters.collections = this.collectionCodeMultiSelect.get("value");
						})
					}, collectionCodeTp.containerNode);

					this.uniqueDataReceived.collections = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
      	}),
      	lang.hitch(this, function (error) {
					this.uniqueDataReceived.collections = true;
					this.checkIfAllUniqueDataReceived(this.uniqueDataReceived);
					console.log(error);
					alert("Unable to get unique collections. Contact server administrator.");
				})
      );
		},

		getSpeciesNameStatus: function(name) {
			document.getElementById("loadingCover").style.display = "block";
			var url = this.services.getStatus + "&name=" + encodeURIComponent(name);
			var requestHandle = esriRequest({
        url: url,
        handleAs: "json"
      });
			requestHandle.then(lang.hitch(this, function (response) {
					this.speciesNameStatusInfo.style.display = "block";
					this.speciesNameStatus.innerHTML = response.results[0].value;
					if (response.results[0].value != "accepted") {
						this.speciesAcceptedName.innerHTML = response.results[1].value;
						this.speciesAcceptedNameInfo.style.display = "block";
					}
					document.getElementById("loadingCover").style.display = "none";
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					document.getElementById("loadingCover").style.display = "none";
				})
      );
		},

		convertCoordinates: function(geometry) {
			var projectionUrl = this.services.projection;
			projectionUrl = projectionUrl + "&inSR=" + geometry.spatialReference.wkid;
			projectionUrl = projectionUrl + "&geometries=" + geometry.xmin + "%2C" + geometry.ymin + "%2C" + geometry.xmax + "%2C" + geometry.ymax;
			var requestHandle = esriRequest({
        url: projectionUrl,
        handleAs: "json"
      });
			requestHandle.then(lang.hitch(this, function (response) {
					this.queryFilters.extent = {
						"xmin": response.geometries[0].x,
						"ymin": response.geometries[0].y,
						"xmax": response.geometries[1].x,
						"ymax": response.geometries[1].y,
						"spatialReference": {"wkid":4326}
					};
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
				})
      );
		},

		resetFilters: function() {
			this.queryFilters.extent = null;
			this.queryFilters.species_name = null;
			this.queryFilters.year1 = "";
			this.queryFilters.year2 = "";
			this.queryFilters.species_groups = null;
			this.queryFilters.institutions = null;
			this.queryFilters.collections = null;
			this.map.graphics.clear();
			dijit.byId("speciesNameInput").set("value", "");
			this.speciesGroupMultiSelect.set("value", []);
			this.speciesGroupMultiSelect._updateSelection();
			this.institutionsMultiSelect.set("value", []);
			this.institutionsMultiSelect._updateSelection();
			this.collectionCodeMultiSelect.set("value", []);
			this.collectionCodeMultiSelect._updateSelection();
			this.obsYear1Input.value = "";
			this.obsYear2Input.value = "";
			this.speciesNameStatusInfo.style.display = "none";
			this.speciesAcceptedNameInfo.style.display = "none";
			this.speciesNameStatus.innerHTML = "";
			this.speciesAcceptedName.innerHTML = "";
		},

		createWhereQuery: function() {
			var sql = "";
			// species name
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")){
				sql = sql + "((scientific_name = '" + this.queryFilters.species_name + "') OR (accepted_name = '" + this.queryFilters.species_name + "'))"
			}

			// year
			if ((this.queryFilters.year1 != "") && (this.queryFilters.year2 != "")) {
				if (this.queryFilters.year1 == this.queryFilters.year2) {
					if (sql.length > 0) {
						sql = sql + " AND ";
					}
					sql = sql + "((year_collected = " + this.queryFilters.year1 + ") OR ((start_year_collected <= " + this.queryFilters.year1 + ") AND (end_year_collected >= " + this.queryFilters.year1 + ")))"
				}
				else if (this.queryFilters.year1 < this.queryFilters.year2) {
					if (sql.length > 0) {
						sql = sql + " AND ";
					}
					sql = sql + "(((year_collected >= " + this.queryFilters.year1 + ") AND (year_collected <= " + this.queryFilters.year2 + ")) OR ((start_year_collected >= " + this.queryFilters.year1 + ") AND (start_year_collected <= " + this.queryFilters.year2 + ")) OR ((end_year_collected >= " + this.queryFilters.year1 + ") AND (end_year_collected <= " + this.queryFilters.year2 + ")) OR ((start_year_collected < " + this.queryFilters.year1 + ") AND (end_year_collected > " + this.queryFilters.year2  + ")))"
				}
			}

			// greater than
			if ((this.queryFilters.year1 != "") && (this.queryFilters.year2 == "")) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				sql = sql + "((year_collected >= " + this.queryFilters.year1 + ") OR (end_year_collected >= " + this.queryFilters.year1 + "))"
			}

			// lower than
			if ((this.queryFilters.year2 != "") && (this.queryFilters.year1 == "")) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				sql = sql + "((year_collected <= " + this.queryFilters.year2 + ") OR (start_year_collected <= " + this.queryFilters.year2 + "))"
			}

			// species groups
			if ((this.queryFilters.species_groups != null) && (this.queryFilters.species_groups.length > 0)) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				if (this.queryFilters.species_groups.length > 1) {
					sql = sql + "(";
					array.forEach(this.queryFilters.species_groups, lang.hitch(this, function(group) {
						sql = sql + "(species_group = '" + group + "') OR "
					}));
					sql = sql.slice(0, -4);
					sql = sql + ")";
				}
				else {
					sql = sql + "(species_group = '" + this.queryFilters.species_groups[0] + "')"
				}
			}

			// collections
			if ((this.queryFilters.collections != null) && (this.queryFilters.collections.length > 0)) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				if (this.queryFilters.collections.length > 1) {
					sql = sql + "(";
					array.forEach(this.queryFilters.collections, lang.hitch(this, function(collection) {
						sql = sql + "(origin_of_data_collection = '" + collection + "') OR "
					}));
					sql = sql.slice(0, -4);
					sql = sql + ")";
				}
				else {
					sql = sql + "(origin_of_data_collection = '" + this.queryFilters.collections[0] + "')"
				}
			}

			// institutions
			if ((this.queryFilters.institutions != null) && (this.queryFilters.institutions.length > 0)) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				if (this.queryFilters.institutions.length > 1) {
					sql = sql + "(";
					array.forEach(this.queryFilters.institutions, lang.hitch(this, function(institution) {
						sql = sql + "(data_source = '" + institution + "') OR "
					}));
					sql = sql.slice(0, -4);
					sql = sql + ")";
				}
				else {
					sql = sql + "(data_source = '" + this.queryFilters.institutions[0] + "')"
				}
			}
			return sql;
		},

		setFiltersForResultView: function() {
			var filtersSelected = false;
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")) {
				this.resultSection.filter_name.innerHTML = this.queryFilters.species_name;
				filtersSelected = true;
			}
			if (this.queryFilters.year1 != "") {
				this.resultSection.filter_year1.innerHTML = this.queryFilters.year1;
				filtersSelected = true;
			}
			if (this.queryFilters.year2 != "") {
				this.resultSection.filter_year2.innerHTML = this.queryFilters.year2;
				filtersSelected = true;
			}
			if ((this.queryFilters.species_groups != null) && (this.queryFilters.species_groups.length > 0)) {
				this.resultSection.filter_groups.innerHTML = this.queryFilters.species_groups.join("; ");
				filtersSelected = true;
			}
			if ((this.queryFilters.institutions != null) && (this.queryFilters.institutions.length > 0)) {
				this.resultSection.filter_institutions.innerHTML = this.queryFilters.institutions.join("; ");
				filtersSelected = true;
			}
			if ((this.queryFilters.collections != null) && (this.queryFilters.collections.length > 0)) {
				this.resultSection.filter_collections.innerHTML = this.queryFilters.collections.join("; ");
				filtersSelected = true;
			}
			if (this.queryFilters.extent != null) {
				var e = this.queryFilters.extent;
				this.resultSection.filter_extent.innerHTML = "South west: " + e.xmin.toFixed(4) + "&deg;, " + e.ymin.toFixed(4) + "&deg; North east: " + e.xmax.toFixed(4) + "&deg;, " + e.ymax.toFixed(4) + "&deg;";
				filtersSelected = true;
			}
			return filtersSelected;
		},

		restoreSearch: function() {
			this.resultSection.filter_name.innerHTML = "";
			this.resultSection.filter_name.innerHTML = "";
			this.resultSection.filter_year1.innerHTML = "";
			this.resultSection.filter_year2.innerHTML = "";
			this.resultSection.filter_groups.innerHTML = "";
			this.resultSection.filter_institutions.innerHTML = "";
			this.resultSection.filter_collections.innerHTML = "";
			this.resultSection.filter_extent.innerHTML = "";

			this.noObservationsFoundCount = 0;
			this.resultSection.noObservationsMessage.style.display = "none";
			this.map.infoWindow.hide();
			this.map.graphics.setVisibility(true);
			this.downloadShpRequested = false;

			this.obsForTable = [];
			this.resultSection.resTable.resetFilter();
			this.resultSection.results_table_container.style.display = "none";

			array.forEach(this.layers, lang.hitch(this, function(layer) {
				layer.resultsDiv.style.display = "none";
				layer.featuresCountSpan.innerHTML = "";
				layer.featuresReceived = false;
				layer.switcher.style.display = "none";
				layer.downloadButton.style.display = "none";
				layer.maxMessage.style.display = "none";
				layer.downloadMaxMessage.style.display = "none";
				layer.graphicsLayer.clear();
			}));
		},

		checkIfAllUniqueDataReceived: function(object) {
			for (var property in object) {
    		if (object.hasOwnProperty(property)) {
        	if (!object[property]) {
						return;
					}
    		}
			}
			document.getElementById("loadingCover").style.display = "none";
		},

		checkIfAllLayersFeaturesReceived: function(req) {
			for (var i = 0; i < this.layers.length; i++) {
				if (!this.layers[i].featuresReceived) {
					return;
				}
			}
			if (req == "OBS") {
				if (!this.resultSection.resTable) {
					this.resultSection.createResultsTable();
				}
				this.resultSection.results_table_container.style.display = "block";
				this.resultSection.resTable.setGridData(this.obsForTable);
			}
			document.getElementById("loadingCover").style.display = "none";
		},

		countObservations: function(layer) {
			var queryCount = new Query();
			queryCount.where = this.createWhereQuery();
			var extent = this.queryFilters.extent;
			if (extent) {
				queryCount.geometry = new Extent(extent);
			}

			layer.queryTask.executeForCount(queryCount, lang.hitch(this, function (count) {
					if (count > 0) {
						layer.resultsDiv.style.display = "block";
						layer.featuresCount = count;
						layer.featuresCountSpan.innerHTML = count;
						this.getFeatures(layer);
					}
					else {
						this.noObservationsFoundCount++;
						if (this.noObservationsFoundCount == this.layers.length) {
							this.resultSection.noObservationsMessage.style.display = "block";
						}
						layer.featuresReceived = true;
						this.checkIfAllLayersFeaturesReceived("CNT");
					}
				}),
				lang.hitch(this, function (error) {
					layer.featuresReceived = true;
					this.checkIfAllLayersFeaturesReceived("CNT");
					console.log(error);
					alert("Unable to perform point count request. Contact server administrator.");
				})
      );
		},

		getFeatures: function(layer) {
			let extent = this.queryFilters.extent;
			let query = new Query();
			query.returnGeometry = true;
			query.outSpatialReference = this.map.spatialReference;
			query.where = this.createWhereQuery();
			query.outFields = ["*"];
			if (extent) {
				query.geometry = new Extent(extent);
			}
			layer.queryTask.execute(query, lang.hitch(this, function (featureSet) {
					layer.graphicsLayer.clear();
					if (featureSet.features.length > 0) {

						let infoWindowContent = "<table>";
						array.forEach(featureSet.fields, lang.hitch(this, function(field) {
							if (this.fields[field.name]) {
								if (this.fields[field.name].type) {
									if (this.fields[field.name].type == "date") {
										infoWindowContent = infoWindowContent + "<tr><td style='padding: 2px;'>" + this.fields[field.name].alias + "</td><td style='padding: 2px;'>${" + field.name + ":DateString(local: false, hideTime: true)}</td></tr>";
									}
									else if (this.fields[field.name].type == "url") {
										infoWindowContent = infoWindowContent + "<tr><td style='padding: 2px;'>" + this.fields[field.name].alias + "</td><td style='padding: 2px;'><a href='${" + field.name + "}' target='_blank'>${" + field.name + "}</td></tr>";
									}
									else if (this.fields[field.name].type == "semicolon") {
										infoWindowContent = infoWindowContent + "<tr><td style='padding: 2px;'>" + this.fields[field.name].alias + "</td><td style='padding: 2px;'>${" + field.name + "}</td></tr>";
									}
								}
								else {
									infoWindowContent = infoWindowContent + "<tr><td style='padding: 2px;'>" + this.fields[field.name] + "</td><td style='padding: 2px;'>${" + field.name + "}</td></tr>";
								}
							}
						}));
						infoWindowContent +="</table>";
						layer.infoTemplate.setContent(infoWindowContent);
						layer.switcher.style.display = "block";
						layer.downloadButton.style.display = "block";

						this.map.setExtent(graphicsUtils.graphicsExtent(featureSet.features), true);

						array.forEach(featureSet.features, lang.hitch(this, function(graphic) {
							graphic.setSymbol(layer.symbol);
							layer.graphicsLayer.add(graphic);
							this.obsForTable.push(graphic.attributes);
						}));
						if (featureSet.features.length == 10000) {
							layer.maxMessage.style.display = "block";
						}
					}
					layer.featuresReceived = true;
					this.checkIfAllLayersFeaturesReceived("OBS");
      	}),
      	lang.hitch(this, function (error) {
					layer.featuresReceived = true;
					this.checkIfAllLayersFeaturesReceived("OBS");
					console.log(error);
					alert("Unable to load points data. Contact server administrator.");
				})
      );
		},

		downloadShapeFile: function(layername) {
			document.getElementById("loadingCover").style.display = "block";
			let url = this.services.downloadShp;
			url = url + "&layer=" + encodeURIComponent(layername);
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")) {
				url = url + "&name=" + encodeURIComponent(this.queryFilters.species_name);
			}
			if (this.queryFilters.year1 != "") {
				url = url + "&year1=" + encodeURIComponent(this.queryFilters.year1);
			}
			if (this.queryFilters.year2 != "") {
				url = url + "&year2=" + encodeURIComponent(this.queryFilters.year2);
			}
			if ((this.queryFilters.species_groups != null) && (this.queryFilters.species_groups.length > 0)) {
				url = url + "&group=" + encodeURIComponent(this.queryFilters.species_groups.join(";"));
			}
			if ((this.queryFilters.institutions != null) && (this.queryFilters.institutions.length > 0)) {
				url = url + "&institution=" + encodeURIComponent(this.queryFilters.institutions.join(";"));
			}
			if ((this.queryFilters.collections != null) && (this.queryFilters.collections.length > 0)) {
				url = url + "&collection=" + encodeURIComponent(this.queryFilters.collections.join(";"));
			}
			if (this.queryFilters.extent != null) {
				url = url + "&xmin=" + encodeURIComponent(this.queryFilters.extent.xmin) + "&ymin=" + encodeURIComponent(this.queryFilters.extent.ymin) + "&xmax=" + encodeURIComponent(this.queryFilters.extent.xmax) + "&ymax=" + encodeURIComponent(this.queryFilters.extent.ymax);
			}
			console.log("download", url);

			let downloadRequestHandle = esriRequest({
				url: url,
				handleAs: "json"
			});
			downloadRequestHandle.then(lang.hitch(this, function (response) {
					console.log("got result", response);
					if ((response.results[0].paramName == "shapefile") && (response.results[0].value)) {
						window.location = response.results[0].value.url;
					}
					else {
						alert("Unable to perform download request. Contact server administrator.");
					}
					document.getElementById("loadingCover").style.display = "none";
				}),
				lang.hitch(this, function (error) {
					document.getElementById("loadingCover").style.display = "none";
					console.log(error);
					alert("Unable to perform download request. Contact server administrator.");
				})
			);
		}
	});
});
