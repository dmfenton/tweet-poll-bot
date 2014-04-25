var http = require("http");
var Twit = require('twit');
var querystring = require("querystring");

if (process.argv.length < 9) {
	throw("argument required");
}

var T = new Twit({
    consumer_key:         process.argv[2],
    consumer_secret:      process.argv[3],
    access_token:         process.argv[4],
    access_token_secret:  process.argv[5]
});

var FEATURE_SERVICE = process.argv[6];
var TOKEN = process.argv[7];
var INTERVAL = process.argv[8];

var FIELDNAME_MATCHED = "Matched";
var FIELDNAME_HIDE = "Hide";
var FIELDNAME_TWEETID = "Tweet_ID";
var FIELDNAME_FID = "FID"; 

var QUERY_URL = FEATURE_SERVICE+"/query?where="+FIELDNAME_MATCHED+"+%3D+%271%27+and+"+FIELDNAME_HIDE+"+%3D+%270%27&outFields="+FIELDNAME_TWEETID+"%2C+"+FIELDNAME_FID+"&returnGeometry=false&f=pjson";

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
	  res.on('data', function (chunk) {
		console.log('BODY: ' + chunk);
	  });
	});
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
	console.log(postData);
	req.write(postData);
	req.end();
}

driver();