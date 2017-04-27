'use strict';


var extend = require('extend'),
    https = require('https'),
    xmlConverter = require('xml2json');


var _DEFAULTS;

_DEFAULTS = {

};


var AmplitudeFactory = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function (options) {
    options = extend({}, _DEFAULTS, options);

    _this.fdsnClient = options.fdsnClient;
  };


  _this.getAmplitudeData = function (feature) {
    var amplitudes,
        eventDetails,
        quakemlJson;

    return _this.getEventDetails(feature).then((result) => {
      eventDetails = result;
      return _this.getQuakemlAsJson(eventDetails);
    }).then((result) => {
      quakemlJson = result;
      return _this.getAmplitudes(quakemlJson);
    }).then((result) => {
      amplitudes = result;
    }).catch((err) => {
      process.stdout.write(err.stack + '\n');
      amplitudes = [];
    }).then(() => {
      feature.properties.amplitude = amplitudes;
      return feature;
    });
  };

  _this.getAmplitudes = function (quakemlJson) {
    return Promise.resolve(
        quakemlJson['q:quakeml'].eventParameters.event.amplitude);
  };

  _this.getEventDetails = function (feature) {
    return _this.fdsnClient.getData({eventid: feature.id});
  };

  _this.getQuakemlAsJson = function (eventDetails) {
    var quakemlUrl;

    quakemlUrl = eventDetails.properties.products['phase-data'][0]
        .contents['quakeml.xml'].url;

    return _this.request(quakemlUrl).then((result) => {
      return JSON.parse(xmlConverter.toJson(result));
    });
  };

  _this.request = function (url) {
    return new Promise((resolve, reject) => {
      var request;

      request = https.request(url, (response) => {
        var buffer;

        buffer = [];

        response.on('data', (data) => {
          buffer.push(data);
        });

        response.on('end', () => {
          try {
            resolve(buffer.join(''));
          } catch (e) {
            reject(e);
          }
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.end();
    });
  };



  _initialize(options);
  options = null;
  return _this;
};


module.exports = AmplitudeFactory;