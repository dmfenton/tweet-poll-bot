var http = require("http");
var https = require("https");
var querystring = require("querystring")
var Twit = require('twit')
var os = require("os");

var _service;

if (process.argv.length < 11) {
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
var USERNAME = process.argv[8];
var PASSWORD = process.argv[9];
var TOKEN_FETCH_INTERVAL_MINUTES = process.argv[10];

var TOKEN;
var GEOTOKEN;

var GEOPARSE_METHOD_BRACKET = "bracket";
var GEOPARSE_METHOD_YQL = "yql";
var GEOPARSE_METHOD_BOSS = "boss";
var GEOPARSE_METHOD_ESRI = "esri";

var _parseMethod = process.argv[11];

getGeoToken(process.argv[12], process.argv[13]);
getToken(init);

function init()
{
	
	console.log("init");
	console.log("parseMethod", _parseMethod)
	if (_parseMethod == GEOPARSE_METHOD_BOSS) {
		var BossService = require("./BossService");
		_service = new BossService(process.argv[12], process.argv[13]);
		console.log("initialized boss service");
	} else if (_parseMethod == GEOPARSE_METHOD_ESRI) {
		var EsriService = require ("./EsriService");
		_service = new EsriService(GEOTOKEN);
	} else { // GEOPARSE_METHOD_YQL
		var YQLService = require("./YQLService");
		_service = new YQLService();
		console.log("initialized yql service");
	}
	
	//
	// filter the public stream by desired hashtag
	//
	
	var stream = T.stream('statuses/filter', {track: TRACK_TEXT})
	
	stream.on('tweet', function (tweet) {
		// test for retweet.
		if (tweet.retweeted_status) {
			console.log(new Date(), "retweet: ", tweet.id_str, tweet.user.id, tweet.text);
		} else {
			var media = tweet.entities.media != null;
			// to do: test for whether tweet is geolocated i.e. 
			// if (tweet.coordinates)
			console.log(new Date(), "attempting: ", tweet.id_str, tweet.user.id, tweet.text, media);
			_service.locationQuery(tweet.text, function(location){
				if (location) {
					console.log("match successful: ", location.placeName, location.x, location.y);
					writeRecord(
						tweet.id_str, 
						tweet.user.id,
						tweet.text,
						media,
						true,
						location.placeName, 
						location.x, 
						location.y,
						function(success){
							if (!success) console.log("WRITE FAILED!");
						}
					);	
				} else { // match failed
					console.log("match failed.");
					if (tweet.user.location) {
						console.log("trying profile location", tweet.user.location);
						_service.locationQuery(tweet.user.location, function(profileLocation){
							if (profileLocation) {
								console.log("profile location match successful: ", profileLocation.placeName, profileLocation.x, profileLocation.y);
								writeRecord(
									tweet.id_str, 
									tweet.user.id,
									tweet.text,
									media,
									true,
									profileLocation.placeName, 
									profileLocation.x, 
									profileLocation.y,
									function(success){
										if (!success) console.log("WRITE FAILED!");									
									}
								);	
							} else {
								console.log("profile location match failed.");
								writeRecord(
									tweet.id_str, 
									tweet.user.id, 
									tweet.text,
									media,
									false,
									null, 
									null, 
									null,
									function(success){
										if (!success) console.log("WRITE FAILED!");									
									}	
								);
							}
						});						

					} else {
						writeRecord(
							tweet.id_str, 
							tweet.user.id, 
							tweet.text,
							media,
							false,
							null, 
							null, 
							null,
							function(success){
								if (!success) console.log("WRITE FAILED!");
							}
						);	
					}
				}
			});
		}

	});
	
	console.log("Tweet poll bot in de heezy!");
	console.log("Listening for "+TRACK_TEXT);
	console.log("Writing to "+FEATURE_SERVICE);

}

function getToken(callBack)
{
	
	var postData = {
		username: USERNAME,
		password: PASSWORD,
		referer: os.hostname(),
		expiration: TOKEN_FETCH_INTERVAL_MINUTES * 2,
		f: "json"
    };
	
	postData = querystring.stringify(postData);
	
	var options = {
		host: "www.arcgis.com",
		method: "POST",
		port: 443,
		path: "https://www.arcgis.com/sharing/rest/generateToken",
		headers:{"Content-Type": "application/x-www-form-urlencoded","Content-Length": postData.length}
	}
	
	var result = "";	

	try {
			
		var req = https.request(options, function(res) {
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				result = result+chunk;
			}).on('end', function(huh){
				TOKEN = JSON.parse(result).token;
				console.log("successfully retrieved token!");
				// do it again later			
				setTimeout(function(){getToken()}, TOKEN_FETCH_INTERVAL_MINUTES * 60 * 1000);
				// call back, if appropriate
				if (callBack) callBack();
			});
		});
	
		req.on('error', function(e) {
			console.log("uh-oh...error in token request");
			// try again in a minute			
			setTimeout(function(){getToken()}, 60000);
		});
		
		req.write(postData);
		req.end();
	
	} catch(err) {
		console.log("problem communicating with token service...");
		// try again in a minute			
		setTimeout(function(){getToken()}, 60000);
	}	
	
}

function getGeoToken(CLIENT_ID, CLIENT_SECRET)
{
	
	path = '/sharing/oauth2/token?client_id=' + CLIENT_ID + '&grant_type=client_credentials&client_secret=' + CLIENT_SECRET + '&f=pjson'
	console.log(path)
	var options = {
		host: "www.arcgis.com",
		path: path
	}
	
	var result = "";	

	try {
			
		var req = https.get(options, function(res) {
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				result = result+chunk;
			}).on('end', function(huh){
				GEOTOKEN = JSON.parse(result);
				GEOTOKEN = GEOTOKEN.access_token;
				console.log("successfully retrieved geo token!");
				// do it again later			
				setTimeout(function(){getGeoToken()}, TOKEN_FETCH_INTERVAL_MINUTES * 60 * 1000);			
			});
		});
	
		req.on('error', function(e) {
			console.log("uh-oh...error in geo token request");
			// try again in a minute			
			setTimeout(function(){getGeoToken()}, 60000);
		});
		
		req.end();
	
	} catch(err) {
		console.log("problem communicating with geo token service...");
		// try again in a minute			
		setTimeout(function(){getGeoToken()}, 60000);
	}	
	
}
function writeRecord(tweetID, userID, text, media, matchStatus, standardizedLocation, x, y, callBack)
{
	try {
		var features = [
			{
				geometry:{x : x, y : y},
				spatialReference:{wkid:4326},
				attributes:{
					Tweet_ID: tweetID, 
					User_ID: userID, 
					Text: text, 
					Media: media, 
					Stand_loc: standardizedLocation, 
					X_coord: x, Y_coord: y, 
					Matched: matchStatus, 
					Vetted: "U", 
					Hide: false
				}
			}
		];
		console.log('adding this to the feature server: ' + JSON.stringify(features))
		
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