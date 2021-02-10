define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on",
	"dojo/_base/array", "dojo/dom-construct", "dojo/dom-style",
	"dijit/Dialog",
	"dojo/domReady!"
], function(
	declare, lang, on,
	array, domConstruct, domStyle,
	Dialog
){
	return declare(null, {
		dialog: null,
		constructor: function(params) {
			this.dialog = new Dialog({
				style: "max-width: 400px;"
			});
		},

		showPopup: function(title, fields, data) {
			let popupContent = "<table class='popupTable'>";
			for (field in fields) {
				if (data.hasOwnProperty(field)) {
					if (data[field] != null) {
						if (fields[field].type) {
							if (fields[field].type == "url") {
								popupContent = popupContent + "<tr><td class='popupCell'>" + fields[field].alias + "</td><td class='popupCell'><a href='" + data[field] + "' target='_blank'>" + data[field] + "</td></tr>";
							}
							else if (fields[field].type == "date") {
								let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
								let d = new Date(data[field]);
								popupContent = popupContent + "<tr><td class='popupCell'>" + fields[field].alias + "</td><td class='popupCell'>" + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + "</td></tr>";
							}
							else if (fields[field].type == "semicolon") {
								popupContent = popupContent + "<tr><td class='popupCell'>" + fields[field].alias + "</td><td class='popupCell'>" + data[field].split(";").join(";<br/>") + "</td></tr>";
							}
						} else {
							popupContent = popupContent + "<tr><td class='popupCell'>" + fields[field] + "</td><td class='popupCell'>" + data[field] + "</td></tr>";
						}
					}
				}
			}
			popupContent +="</table>";
			this.dialog.set("content", popupContent);
			this.dialog.set("title", title);
			this.dialog.show();
			/*
			for (var name in props) {
				if ((props.hasOwnProperty(name)) && (name != "id") && (name != "OBJECTID")) {
					if (name == "external_link") {
						popupContent = popupContent + "<tr><td style='width: 50%;'>" + this.fields[name] + "</td><td><a href='" + props[name] + "' target='_blank'>" + props[name] + "</td></tr>";
					}
					else {

					}
				}
			}
			*/
		}
	});
});
