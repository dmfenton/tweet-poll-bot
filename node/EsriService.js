function EsriService(GEOTOKEN)
{
	this.token = GEOTOKEN;
	var http = require("http");
	var GenericLocation = require("./GenericLocation")
	this.locationQuery = function(text, callBack)
	{
		var path = encodeURI('/arcgis/rest/services/World/GeocodeServer/find?forStorage=true&token=' + this.token + '&text=' + text + '&f=json');
		var opts = {
			host: "geocode.arcgis.com",
			path:path
		}
		console.log(path)
		var result = "";
		var req = http.get(opts, function(res) {
			res.setEncoding("utf8");
			res.on('data', function(chunk) {
				result = result+chunk;
				console.log(result);
			}).on('end', function(huh) {			
				var json = JSON.parse(result);
				if (json == null) {
					console.log("null query results");
					callBack(null);
				} else {
					console.log(json)
					if (json.locations.length == 0) {
						callBack(null);
					} else {
						var mtch = json.locations[0];
						console.log(mtch.name + ' ' + mtch.feature.geometry.x  + ' ' +  mtch.feature.geometry.y)
						callBack(new GenericLocation(mtch.name, mtch.feature.geometry.x, mtch.feature.geometry.y))
					}
				}
			}).on('error',function(error){
				console.log("uh-oh...");
				callBack(null);
			});
		});	
	}
	
}

module.exports = EsriService;