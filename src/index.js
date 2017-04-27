'use strict';

var extend = require('extend'),
    fs = require('fs'),
    WebService = require('./lib/web-service');


var config,
    configPath,
    service;


configPath = 'src/conf/config.json';

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  process.stderr.write('Application configuration not found,' +
      ' recommend running "npm configure"\n');

  config = {};
}

config = extend(config, process.env);


service = WebService(config);
service.start();
