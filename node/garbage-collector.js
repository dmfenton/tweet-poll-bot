var http = require("http");
var Twit = require('twit');
var querystring = require("querystring");

if (process.argv.length < 8) {
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

var QUERY_URL = FEATURE_SERVICE+"/query?where=Matched+%3D+%271%27+and+Hide+%3D+%270%27&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&outFields=Tweet_ID%2C+FID&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&f=pjson&token=";

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
				var feature = features[i];
				check(feature.attributes.Tweet_ID, function(){hideRecord(feature.attributes.FID)});
			}
		});
	});
	
	setTimeout(driver, 300000);
	
}


function check(id, callBack)
{
	T.get('statuses/show/:id', {id:id}, function(err, reply){
		if (err) {
			if (err.statusCode == 404) {
				console.log("tweet "+id+" is NOT good, and should be hidden...");
				callBack();
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