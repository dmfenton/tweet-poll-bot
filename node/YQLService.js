function YQLService()
{
	
	var http = require("http");
	var GenericLocation = require("./GenericLocation")

	this.locationQuery = function(text, callBack)
	{
		var path = encodeURI('/v1/public/yql?q=SELECT * FROM geo.placemaker WHERE documentContent = "'+text+'" AND documentType = "text/plain"&format=json');
		
		var opts = {
			host: "query.yahooapis.com",
			path:path
		}
		
		var result = "";
		
		var req = http.get(opts, function(res) {
			res.setEncoding("utf8");
			res.on('data', function(chunk) {
				result = result+chunk;
			}).on('end', function(huh) {			
				var json = JSON.parse(result);
				if (json.query.results.matches == null) {
					console.log("no matches");
					callBack(null);
				} else {
					var mtch = json.query.results.matches.match;
					if ( Object.prototype.toString.call( mtch ) === '[object Array]' ) {
						mtch = mtch[0].place;
					} else {
						mtch = mtch.place;
					}
					callBack(new GenericLocation(mtch.name, mtch.centroid.longitude, mtch.centroid.latitude))
				}
			}).on('error',function(error){
				console.log("uh-oh...");
				callBack(null);
			});
		});	
	}
	
}

module.exports = YQLService;