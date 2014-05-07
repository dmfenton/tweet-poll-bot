var http = require("http");
var querystring = require("querystring")
var Twit = require('twit')

if (process.argv.length < 8) {
	throw("argument required");
}

var TRACK_TEXT = process.argv[2];
var T = new Twit({
    consumer_key:         process.argv[3],
    consumer_secret:      process.argv[4],
    access_token:         process.argv[5],
    access_token_secret:  process.argv[6]
});
var FEATURE_SERVICE = process.argv[7];
var TOKEN = process.argv[8];

//
// filter the public stream by desired hashtag
//

var stream = T.stream('statuses/filter', {track: TRACK_TEXT})

stream.on('tweet', function (tweet) {
	// to do: test for retweet.
	altQuery(tweet.text, function(location){
		if (location) {
			writeRecord(
				tweet.id_str, 
				tweet.user.id, 
				true,
				location.name, 
				location.feature.geometry.x, 
				location.feature.geometry.y,
				function(success){
					writeToLog(
						tweet.id_str, 
						tweet.user.id, 
						tweet.text, 
						success ? 0 : 2, 
						location.name, 
						location.feature.geometry.x, 
						location.feature.geometry.y
					);
				}
			);	
		} else { // match failed
			writeRecord(
				tweet.id_str, 
				tweet.user.id, 
				false,
				null, 
				null, 
				null,
				function(success){
					writeToLog(
						tweet.id_str, 
						tweet.user.id, 
						tweet.text, 
						success ? 0 : 2, 
						null, 
						null, 
						null
					);
				}
			);	
		}
	});
});

console.log("Tweet poll bot in de heezy!");
console.log("Listening for "+TRACK_TEXT);
console.log("Writing to "+FEATURE_SERVICE);

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

function writeRecord(tweetID, userID, matchStatus, standardizedLocation, x, y, callBack)
{
	try {
		var features = [
			{
				geometry:{x : x, y : y},
				spatialReference:{wkid:4326},
				attributes:{Tweet_ID: tweetID, User_ID: userID, Standardized_Location: standardizedLocation, Short_Name: "Test", X: x, Y: y, Matched: matchStatus, Hide: false}
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

		var result = "";	
		
		var req = http.request(options, function(res) {
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				result = result+chunk;
			}).on('end', function(huh){
				if (JSON.parse(result).addResults) {
					callBack(true);
				} else {
					callBack(false);
				};
			});
		});
		
		req.on('error', function(e) {
			console.log('problem with request: ' + e.message);
			callBack(false)
		});
		
		req.write(postData);
		req.end();

	} catch(err) {
		console.log(tweetID, ": Cannot write to feature service...");
		callBack(false)
	}
	
}

function writeToLog(tweetID, tweetUserID, tweetText, status, locationName, x, y)
{
	console.log(tweetID, tweetUserID, tweetText, status, locationName, x, y);
}
