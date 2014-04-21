var http = require("http");
var Twit = require('twit');
var querystring = require("querystring");

if (process.argv.length < 7) {
	throw("argument required");
}

var T = new Twit({
    consumer_key:         process.argv[2],
    consumer_secret:      process.argv[3],
    access_token:         process.argv[4],
    access_token_secret:  process.argv[5]
});

var FEATURE_SERVICE = process.argv[6];

var QUERY_URL = FEATURE_SERVICE+"/query?where=1+%3D+1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&outFields=Tweet_ID&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&f=pjson&token=";

var opts = {host: "services.arcgis.com", path: QUERY_URL};

function driver()
{
	
	console.log(new Date());
	
	var text = "";
	
	var req = http.get(opts, function(res) {
		res.setEncoding("utf8");
		res.on('data', function(chunk) {
			text = text+chunk;
		}).on('end', function(huh) {
			var features = JSON.parse(text).features;
			for (var i = 0; i < features.length; i++)
			{
				check(features[i].attributes.Tweet_ID);
			}
		});
	});
	
	setTimeout(driver, 300000);
	
}


function check(id)
{
	T.get('statuses/show/:id', {id:id}, function(err, reply){
		if (err) {
			if (err.statusCode == 404) {
				console.log("tweet "+id+" is NOT good, and should be deleted...");
				//deleteRecord(id);
			} else {
				console.log("tweet "+id+" caused an error from Twitter.");
			}
			return false;
		} else {
			//console.log("tweet "+id+" is good.");
		}
	});
}

function deleteRecord(tweetID)
{
	
	var where = "Tweet_ID = "+tweetID;
	console.log(where);

	var postData = {
		where: where,
		f:"pjson"
	}; 
	
	postData = querystring.stringify(postData);
	
	var options = {
		host: "services.arcgis.com",
		method: "POST",
		port: 80,
		path: FEATURE_SERVICE+"/deleteFeatures",
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
	
}


driver();