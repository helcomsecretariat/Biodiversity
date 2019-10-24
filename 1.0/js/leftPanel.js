define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo",
	"dojo/on",
	"dojo/dom",
	"dojo/_base/array",
	"widgets/searchSection",
	"widgets/resultsSection",
	"widgets/downloadSection",
	"widgets/backgroundInfoSection",
	"widgets/helpSection",
	"widgets/aboutSection"
], function(
	declare,
	lang,
	dojo,
	on,
	dom,
	array,
	searchSection,
	resultsSection,
	downloadSection,
	backgroundInfoSection,
	helpSection,
	aboutSection
){
	return declare(null, {
		map: null,
		mapConfig: null,
		startExtent: null,
		startCenter: null,
		startZoom: null,
		searchSection: null,
		resultsSection: null,
		downloadSection: null,
		helpSection: null,
		backgroundInfoSection: null,
		services: null,

		constructor: function(params) {
			this.map = params.map;
			//this.mapConfig = params.mapConfig,
			//this.startExtent = this.map.extent;
			//this.startCenter = this.map.center;
			//this.startZoom = this.map.getZoom();
			this.services = params.services;
			this.setupSearchTask();
			this.setupDownloadTask();
			this.setupBackgroundInfoTask();
			this.setupHelpTask();
			this.setupAboutTask();
		},

		setupSearchTask: function() {

			var searchContainer = dom.byId("searchContainer");
			this.resultsSection = new resultsSection({map: this.map}).placeAt(searchContainer);
			this.searchSection = new searchSection({map: this.map, services: this.services, resultSection: this.resultsSection}).placeAt(searchContainer);

			on(this.searchSection.searchButtonTop, "click", lang.hitch(this, function() {
				this.searchButtonClick();
			}));

			on(this.searchSection.searchButtonBottom, "click", lang.hitch(this, function() {
				this.searchButtonClick();
			}));

			on(this.searchSection.clearFiltersButtonTop, "click", lang.hitch(this, function() {
				this.searchSection.resetFilters();
			}));

			on(this.searchSection.clearFiltersButtonBottom, "click", lang.hitch(this, function() {
				this.searchSection.resetFilters();
			}));

			on(this.resultsSection.updateSearchButton, "click", lang.hitch(this, function() {
				this.searchSection.restoreSearch();
				//this.map.setExtent(this.startExtent, true);
				//this.map.centerAndZoom(this.startCenter, this.startZoom);
				document.getElementById("searchSection").style.display = "block";
				document.getElementById("resultsSection").style.display = "none";
			}));

			on(this.resultsSection.newSearchButton, "click", lang.hitch(this, function() {
				this.searchSection.restoreSearch();
				this.searchSection.resetFilters();
				//this.map.setExtent(this.startExtent, true);
				//this.map.centerAndZoom(this.startCenter, this.startZoom);
				document.getElementById("searchSection").style.display = "block";
				document.getElementById("resultsSection").style.display = "none";
			}));

			//on(this.resultsSection.downloadPointsButton, "click", lang.hitch(this, function() {
				/*if (this.searchSection.totalCountPoints + this.searchSection.totalCountGrid5x5 > 100000) {
					this.resultsSection.pointsDownloadMaxMessage.style.display = "block";
				}
				else {
					this.searchSection.downloadShapeFile("point");
				}*/
			//	this.searchSection.downloadShapeFile("point");
			//}));

			/*on(this.resultsSection.downloadGrid5x5Button, "click", lang.hitch(this, function() {
				if (this.searchSection.totalCountPoints + this.searchSection.totalCountGrid5x5 > 100000) {
					this.resultsSection.grid5x5DownloadMaxMessage.style.display = "block";
				}
				else {
					this.searchSection.downloadShapeFile("grid5x5");
				}
			}));*/
		},

		searchButtonClick: function() {
			this.startCenter = this.map.center;
			this.startZoom = this.map.getZoom();
			if (this.searchSection.setFiltersForResultView()) {
				document.getElementById("loadingCover").style.display = "block";
				this.map.graphics.setVisibility(false);

				array.forEach(this.searchSection.layers, lang.hitch(this, function(layer) {
					this.searchSection.countObservations(layer);
				}));

				document.getElementById("searchSection").style.display = "none";
				document.getElementById("resultsSection").style.display = "block";
			}
			else {
				alert("No search filters selected.");
			}
		},

		setupDownloadTask: function() {
			var downloadContainer = dom.byId("downloadContainer");
			this.downloadSection = new downloadSection().placeAt(downloadContainer);
		},

		setupBackgroundInfoTask: function() {
			var backgroundInfoContainer = dom.byId("backgroundInfoContainer");
			this.backgroundInfoSection = new backgroundInfoSection().placeAt(backgroundInfoContainer);
		},

		setupHelpTask: function() {
			var helpContainer = dom.byId("helpContainer");
			this.helpSection = new helpSection().placeAt(helpContainer);
		},

		setupAboutTask: function() {
			var aboutContainer = dom.byId("aboutContainer");
			this.aboutSection = new aboutSection().placeAt(aboutContainer);
		}
	});
});
