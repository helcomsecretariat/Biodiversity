define([
	"dojo/_base/declare",
	"dojo/dom",
	"dojo/_base/lang",
	"dojo/dom-style",
	"dojo/_base/array",
	"dojo/on",
	"esri/map", "esri/dijit/BasemapGallery", "esri/dijit/BasemapLayer", "esri/dijit/Basemap", "esri/layers/ArcGISTiledMapServiceLayer",
	"app/js/leftPanel"
], function(
	declare, dom, lang, domStyle, array, on,
	Map, BasemapGallery, BasemapLayer, Basemap, ArcGISTiledMapServiceLayer,
  leftPanel
) {
	return declare(null, {
		map: null,
		leftPane: null,
		constructor: function(params) {
			var services = params.services
			var mapConfig = params.mapConfig;

			this.map = new Map("map", {
        spatialReference: mapConfig.spatialReference,
				center: mapConfig.center,
				zoom: mapConfig.zoom,
        lods: mapConfig.lods,
        sliderPosition: "top-right"
      });

			var basemapGallery = new BasemapGallery({
        showArcGISBasemaps: false,
        map: this.map
      }, "basemapGallery");

      array.forEach(mapConfig.basemaps, lang.hitch(this, function(configBasemap) {
        var bl = new BasemapLayer({
          url: configBasemap.url
        });
        var basemap = new Basemap({
          layers: [bl],
          thumbnailUrl: appVersion + "/img/" + configBasemap.thumbnail
        });
        basemapGallery.add(basemap);
      }));
      basemapGallery.startup();
      var basemapLayer = new ArcGISTiledMapServiceLayer(mapConfig.basemaps[0].url, {
        "id": "Basemap"
      });
      this.map.addLayer(basemapLayer);

			basemapGallery.on("selection-change",function() {
    		var basemap = basemapGallery.getSelected();
				var mapContainer = dom.byId("map");
				if (basemap.id == "basemap_0") {
					dojo.style("map", "background-color", "#CDD7FF");
				}
				else if (basemap.id == "basemap_1") {
					dojo.style("map", "background-color", "#BBCCD3");
				}
  		});

			this.leftPane = new leftPanel({map: this.map, services: services, mapConfig: mapConfig});
		},

    show: function(open) {
			domStyle.set(this.domNode, "display", open ? "block" : "none");
		}
  });
});
