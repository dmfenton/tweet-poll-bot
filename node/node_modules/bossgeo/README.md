node-bossgeo
============

A node.js wrapper for the [Yahoo! BOSS Geo API](http://developer.yahoo.com/boss/geo/).

## Installation

    npm install bossgeo

## Usage

First, create a client using your consumer key and consumer secret:

```javascript
var BossGeoClient = require('bossgeo').BossGeoClient;
var bossgeo = new BossGeoClient(
    'consumerKey',
    'consumerSecret'
);
```

Then, you may query the [PlaceFinder](http://developer.yahoo.com/boss/geo/docs/requests-pf.html) and [PlaceSpotter](http://developer.yahoo.com/boss/geo/docs/key-concepts.html) services as follows:

```javascript
bossgeo.placefinder({
    q: '701 first avenue sunnnyvale'
}, function(err, res) {
    if (err) {
        console.log('error: ' + err);
        return;
    }

    console.log(JSON.stringify(res, null, 4));
});

bossgeo.placespotter({
    documentType: 'text/plain',
    documentContent: 'I live in San Francisco.'
}, function(err, res) {
    if (err) {
        console.log('error: ' + err);
        return;
    }

    console.log(JSON.stringify(res, null, 4));
});
```

## More information

The bossgeo wrapper will force JSON responses from the BOSS Geo API as well as convert
numerical errors to human-readable descriptions.

### Placefinder

Placefinder has two parameter types. Documentation on these arguments can be found at:
 * http://developer.yahoo.com/boss/geo/docs/location-parameters.html (key-value)
 * http://developer.yahoo.com/boss/geo/docs/control-parameters.html (flag-based)

### Placespotter

Placespotter has only one parameter type; docs can be found at:
 * http://developer.yahoo.com/boss/geo/docs/placespotter_webservice.html (key-value)


### Oauth 1.0a implementation

This wrapper provides its own OAuth 1.0a implementation, which is complete sans access and refresh token fetching.

## License

MIT