define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
	"esri/request",
	"app/js/startupWindow",
	"app/js/mapManager",
	"dojo/domReady!"
], function(
	declare, lang, on, dom,
	esriRequest,
	startupWindow, mapManager
) {
	return declare(null, {
		mM: null,
		adminViewManagerObj: null,
		adminView: false,
		adminLayerList: null,
		constructor: function() {
			if (this.isIE()){
			    alert("We apologize, this browser is not supported.");
			}

			this.showStartupBox();

			var windowUrl = window.location.pathname;
      windowUrl = windowUrl.replace("index.html", "");
      var requestHandle = esriRequest({
        url: windowUrl + appVersion + "/config/config.json",
        handleAs: "json"
      });
      requestHandle.then(this.requestSucceeded, this.requestFailed);

			var aboutButton = dom.byId("aboutButton");
			on(aboutButton, "click", lang.hitch(this, function() {
				document.getElementById("screenCover").style.display = "block";
				document.getElementById("startupBox").style.display = "block";
			}));
		},

		isIE: function() {
			ua = navigator.userAgent;
			/* MSIE used to detect old browsers and Trident used to newer ones*/
			var is_ie = ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;
			return is_ie;
		},

		requestSucceeded: function(response, io) {
			this.mM = new mapManager({mapNode: "map", mapConfig: response.map, services: response.services});
    },
    requestFailed: function(error, io) {
      console.log("Error. Unable to read application configuration file. Error message: ", error.message);
    },

		showStartupBox: function() {
			var startupBoxDiv = dom.byId("startupBox");
			document.getElementById("screenCover").style.display = "block";
			document.getElementById("startupBox").style.display = "block";
			var startBox = new startupWindow().placeAt(startupBoxDiv);
		}
	});
});
