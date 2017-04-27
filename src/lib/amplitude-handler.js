'use strict';


var AmplitudeFactory = require('./amplitude-factory'),
    extend = require('extend');


var _DEFAULTS;

_DEFAULTS = {

};


var AmplitudeHandler = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function (options) {
    options = extend({}, _DEFAULTS, options);

    _this.fdsnClient = options.fdsnClient;
    _this.amplitudeFactory = AmplitudeFactory(options);
  };


  _this.get = function (params) {
    return _this.fdsnClient.getData(params).then((result) => {
      return Promise.all(result.features.map((feature) => {
        return _this.amplitudeFactory.getAmplitudeData(feature);
      }));
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = AmplitudeHandler;