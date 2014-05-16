var http = require("http");
var https = require("https");
var Twit = require('twit');
var querystring = require("querystring");
var os = require("os");

if (process.argv.length < 11) {
	throw("argument required");
}

var T = new Twit({
    consumer_key:         process.argv[2],
    consumer_secret:      process.argv[3],
    access_token:         process.argv[4],
    access_token_secret:  process.argv[5]
});

var FEATURE_SERVICE = process.argv[6];
var INTERVAL = process.argv[7];

var USERNAME = process.argv[8];
var PASSWORD = process.argv[9];
var TOKEN_FETCH_INTERVAL_MINUTES = process.argv[10];

var FIELDNAME_MATCHED = "Matched";
var FIELDNAME_HIDE = "Hide";
var FIELDNAME_TWEETID = "Tweet_ID";
var FIELDNAME_FID = "FID"; 

var QUERY_URL = FEATURE_SERVICE+"/query?where="+FIELDNAME_MATCHED+"+%3D+%271%27+and+"+FIELDNAME_HIDE+"+%3D+%270%27&outFields="+FIELDNAME_TWEETID+"%2C+"+FIELDNAME_FID+"&returnGeometry=false&f=pjson";

var TOKEN;

var opts = {host: "services.arcgis.com", path: QUERY_URL};

function driver()
{
	
	console.log("Roll call:", new Date());
	
	var text = "";
	
	var req = http.get(opts, function(res) {
		res.setEncoding("utf8");
		res.on('data', function(chunk) {
			text = text+chunk;
		}).on('end', function(huh) {
			var features = JSON.parse(text).features;
			for (var i = 0; i < features.length; i++)
			{
				var feature = features[i];
				check(feature, function(feature){hideRecord(feature.attributes[FIELDNAME_FID])});
			}
		});
	});
	
	setTimeout(driver, INTERVAL);
	
}

function check(feature, callBack)
{
	var id = feature.attributes[FIELDNAME_TWEETID];
	T.get('statuses/show/:id', {id:id}, function(err, reply){
		if (err) {
			if (err.statusCode == 404) {
				console.log("tweet "+id+" is NOT good, and should be hidden...");
				callBack(feature);
			} else {
				console.log("tweet "+id+" caused an error from Twitter.");
			}
		} else {
			// nothing
		}
	});
}

function hideRecord(id)
{
	var postData = {
		f:"pjson",
		token: TOKEN,
		features: JSON.stringify([{attributes:{Hide: '1', FID: id}}]),
		rollbackOnFailure:false
	}; 
	postData = querystring.stringify(postData);
	var options = {
		host: "services.arcgis.com",
		method: "POST",
		port: 80,
		path: FEATURE_SERVICE+"/updateFeatures",
		headers:{"Content-Type": "application/x-www-form-urlencoded","Content-Length": postData.length}
	}
	
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		var json = "";
		res.on('data', function (chunk) {
			json = json+chunk;
		}).on('end', function(huh) {
			console.log(JSON.parse(json));
		});
	});
	
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
	req.write(postData);
	req.end();
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

getToken(driver);
