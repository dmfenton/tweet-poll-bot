function BossService(key, secret)
{
	var BossGeoClient = require('bossgeo').BossGeoClient;
	var GenericLocation = require("./GenericLocation");
	
	var _bossGeoClient = new BossGeoClient(key, secret);

	this.locationQuery = function(text, callBack)	
	{
		var opts = {
			documentType: 'text/plain',
			documentContent: text
		}
		
		_bossGeoClient.placespotter(opts, function handler(err, res) {
			if (err) {
				console.log("boss error:", err)
				callBack(null);
			} else {
				try {
					
					var data = res.document.placedetails;
					if (!data) {
						callBack(null);
						return;
					}
					
					if ( Object.prototype.toString.call( data ) === '[object Array]' ) {
						data = data[0].place;
					} else {
						data = data.place;
					}
					
					callBack(new GenericLocation(data.name, data.centroid.longitude, data.centroid.latitude));
					
				} catch(err) {
					callBack(null);
				}
			}
		});

	}
}


module.exports = BossService;