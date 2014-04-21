var http = require("http");
var querystring = require("querystring")
var Twit = require('twit')
var BossGeoClient = require('bossgeo').BossGeoClient;

if (process.argv.length < 13) {
	throw("argument required");
}

var ERROR_LIMIT = process.argv[11];
var TWEET_LIMIT = process.argv[12];
var TRACK_TEXT = process.argv[2];
var FEATURE_SERVICE = process.argv[3];
var TOKEN = process.argv[10];

var _tweetCount = 0;

var T = new Twit({
    consumer_key:         process.argv[4],
    consumer_secret:      process.argv[5],
    access_token:         process.argv[6],
    access_token_secret:  process.argv[7]
});

var bossgeo = new BossGeoClient(
    process.argv[8],
    process.argv[9]
);

//
// filter the public stream by desired hashtag
//

var stream = T.stream('statuses/filter', {track: TRACK_TEXT})

stream.on('tweet', function (tweet) {
	_tweetCount++;
	if (_tweetCount < TWEET_LIMIT) {
		console.log(tweet.id_str, tweet.text, tweet.user.id);
		//launchQuery(tweet);
		altQuery(tweet.text, function(location){
			if (location) {
				writeRecord(
					tweet.id_str, 
					tweet.user.id, 
					location.name, 
					location.feature.geometry.x, 
					location.feature.geometry.y
				);	
			}
		});
	} else {
		console.log("ALL DONE HERE!!!");
	}
});

console.log("Tweet poll bot in de heezy!");
console.log("Listening for "+TRACK_TEXT);
console.log("Writing to "+FEATURE_SERVICE);


function launchQuery(tweet)
{
	var errorCount = 0;
	var opts = {
		documentType: 'text/plain',
		documentContent: tweet.text
	}
	console.log(tweet.id_str, ": attempt #", errorCount);
	bossgeo.placespotter(opts, handler);
	function handler(err, res) 
	{
		if (err) {
			errorCount++;
			if (errorCount < ERROR_LIMIT) {
				console.log(tweet.id_str, ": attempt #", errorCount);
				bossgeo.placespotter(opts, handler);
			} else {
				console.log(tweet.id_str, ": END : error limit reached");
			}
			return;
		}
		try {
			var placeDetails = res.document.placedetails;
			if ( Object.prototype.toString.call( placeDetails ) === '[object Array]' ) {
				placeDetails = placedetails[0];
			}
			console.log(tweet.id_str, ": SUCCESS: ", placeDetails.place.name);
			writeRecord(tweet.id_str, tweet.user.id, placeDetails.place.name, placeDetails.place.centroid.longitude, placeDetails.place.centroid.latitude);
		} catch(err) {
			console.log(tweet.id_str, ": END : yahoo couldn't match...");
		}
	}	
}

function altQuery(text, callBack)
{
	var placeName = parsePlaceName(text);
	if (!placeName) callBack(null);
	
	var url = "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?text="+escape(placeName)+"&maxLocations=6&f=json";	
	var result = "";	
	var opts = {host: "geocode.arcgis.com", path: url};
	
	var req = http.get(opts, function(res) {
		res.setEncoding("utf8");
		res.on('data', function(chunk) {
			result = result+chunk;
		}).on('end', function(huh) {
			var locations = JSON.parse(result).locations;
			if (locations.length == 0) callBack(null);
			else callBack(locations[0]);
		});
	});	
}

function parsePlaceName(text)
{
	// find place name
	var idx = text.indexOf("{");
	if (idx < 0) return null;
	var placeName = text.substring(idx+1);
	idx = placeName.indexOf("}");
	if (idx < 0) return null;
	return(placeName.substring(0, idx));
}

function writeRecord(tweetID, userID, standardizedLocation, x, y)
{
	try {
		console.log(tweetID, userID, standardizedLocation, x, y);
		var features = [
			{
				geometry:{x : x, y : y},
				spatialReference:{wkid:4326},
				attributes:{Tweet_ID: tweetID, User_ID: userID, Standardized_Location: standardizedLocation, Short_Name: "Test", X: x, Y: y}
			}
		];
		
		var postData = {
			features:JSON.stringify(features),
			f:"pjson",
			token: TOKEN
		}; 
		
		postData = querystring.stringify(postData);
		
		var options = {
			host: "services.arcgis.com",
			method: "POST",
			port: 80,
			path: FEATURE_SERVICE.replace("http://services.arcgis.com","")+"/addFeatures",
			headers:{"Content-Type": "application/x-www-form-urlencoded","Content-Length": postData.length}
		}
		
		var req = http.request(options, function(res) {
		  res.setEncoding('utf8');
		  res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		  });
		});
		
		req.on('error', function(e) {
		  console.log('problem with request: ' + e.message);
		});
		
		req.write(postData);
		req.end();

	} catch(err) {
		console.log(tweetID, ": Cannot write to feature service...");
	}
	
}



