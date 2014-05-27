function YQLService()
{
	
	var http = require("http");

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
						callBack(mtch[0].place)
					} else {
						callBack(mtch.place);
					}
				}
			}).on('error',function(error){
				console.log("uh-oh...");
				callBack(null);
			});
		});	
	}
	
}

module.exports = YQLService;