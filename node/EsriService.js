function EsriService(GEOTOKEN)
{
	
	var http = require("http");
	var GenericLocation = require("./GenericLocation")

	this.locationQuery = function(text, callBack)
	{
		var path = encodeURI('arcgis/rest/services/World/GeocodeServer/find?forStorage=true&token=' + GEOTOKEN + '&text=' + text + '&f=json');
		
		var opts = {
			host: "geocode.arcgis.com",
			path:path
		}
		
		var result = "";
		
		var req = http.get(opts, function(res) {
			res.setEncoding("utf8");
			res.on('data', function(chunk) {
				result = result+chunk;
				console.log(result)
			}).on('end', function(huh) {			
				var json = JSON.parse(result);
				if (json.query == null) {
					console.log("null query results");
					callBack(null);
				} else {
					if (json.query.locations == []) {
						callBack(null);
					} else {
						var mtch = json.query.locations.name;
						if ( Object.prototype.toString.call( mtch ) === '[object Array]' ) {
							mtch = mtch[0].place;
						} else {
							mtch = mtch.name;
						}
						callBack(new GenericLocation(mtch.name, mtch.feature.geometry.x, mtch.feature.geometry.x))
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