'use strict';


var AmplitudeHandler = require('./amplitude-handler'),
    express = require('express'),
    extend = require('extend'),
    WebServiceAccessor = require('./web-service-accessor');


var _DEFAULTS;

_DEFAULTS = {
  MOUNT_PATH: '',
  PORT: 8000,
  FDSN_URL: '/fdsnws/event/1/query.geojson'
};


/**
 * @class WebService
 *
 * Sets up an express server and creates routes and handlers to deal with
 * requests.
 *
 * @param options {Object}
 *
 */
var WebService = function (options) {
  var _this,
      _initialize,

      _docRoot,
      _fdsnClient,
      _mountPath,
      _port;


  _this = {};

  /**
   * Creates the routing handlers for the service.
   *
   * @param options {Object}
   */
  _initialize = function (options) {
    options = extend(true, {}, _DEFAULTS, options);

    _docRoot = options.webDir;
    _mountPath = options.MOUNT_PATH;
    _port = options.PORT;

    // Create an FDSN Client that the various handlers will use
    _fdsnClient = WebServiceAccessor(extend({}, options, {
      url: options.FDSN_URL
    }));
    options.fdsnClient = _fdsnClient;

    // Setup handlers
    _this.handlers = {
      'amplitude.json': AmplitudeHandler(options)
    };
  };

  /**
   * Frees resources associated with service.
   *
   */
  _this.destroy = function () {
    var endpoint;

    if (_this === null) {
      return;
    }

    for (endpoint in _this.handlers) {
      _this.handlers[endpoint].destroy();
    }

    _fdsnClient.destroy();

    _docRoot = null;
    _fdsnClient = null;
    _mountPath = null;
    _port = null;

    _initialize = null;
    _this = null;
  };

  /**
   * Route target for dynamic GET requests.
   *
   * The request will have a `method` parameter indicating the method to
   * handle. If a handler is registered, the handler is invoked and the
   * request is served, otherwise handling is deferred to the `next`
   * middleware in the chain.
   *
   * @param request {Express.Request}
   * @param response {Express.Response}
   * @param next {Function}
   *
   */
  _this.get = function (request, response, next) {
    var day,
        handler,
        method,
        month,
        stamp,
        year;

    method = request.params.method;
    if (!(method in _this.handlers)) {
      return next();
    }

    _this.setHeaders(response);

    // Hacks to make default requests more reasonable since the service itself
    // is not very fault tolerant.
    request.query.minmagnitude = Math.max(
      parseFloat(request.query.minmagnitude || 0),
      4.5
    );

    if (!request.query.hasOwnProperty('starttime')) {
      stamp = new Date();
      year = stamp.getUTCFullYear();
      month = stamp.getUTCMonth() + 1;
      day = stamp.getUTCDate();

      if (month < 10) {
        month = '0' + month;
      }

      if (day < 10) {
        day = '0' + day;
      }

      request.query.starttime = `${year}-${month}-${day}`;
    }

    try {
      handler = _this.handlers[method];

      handler.get(request.query)
        .then((data) => {
          _this.onSuccess(data, request, response, next);
        })
        .catch((err) => {
          _this.onError(err, request, response, next);
        })
        .then(() => {
          handler = null;
        });
    } catch (err) {
      _this.onError(err, request, response, next);
    }
  };

  /**
   * Creates a metadata object to provide in the response body. This object
   * contains a timestamp, request URL, and a status indicator.
   *
   * @param request {Express.Request}
   *     The request for which to generate metata.
   * @param isSuccess {Boolean}
   *     Is this response representing a successful request?
   *
   * @return {Object}
   *     An object with metadata information about the response.
   */
  _this.getResponseMetadata = function (request, isSuccess) {
    var params,
        protocol;

    request = request || {};
    params = request.query || {};

    if (typeof request.get === 'function') {
      protocol = request.get('X-Forwarded-Proto');
    }

    if (!protocol) {
      protocol = request.protocol;
    }

    return {
      date: new Date().toISOString(),
      status: isSuccess ? 'success' : 'error',
      url: protocol + '://' + request.hostname + request.originalUrl,
      parameters: params
    };
  };

  _this.log = function (request, response, payload, status) {
    var ip,
        length,
        method,
        path,
        timestamp,
        userAgent;

    request = request || {};

    // Checked proxy-forwarded ip
    if (typeof request.get === 'function') {
      ip = request.get('X-Client-IP');
      if (!ip) {
        ip = request.get('X-Forwarded-For');
      }

      userAgent = request.get('User-Agent');
    }

    if (!ip) {
      ip = request.ip;
    }

    length = payload ? JSON.stringify(payload).length : '-';
    method = request.method;
    path = request.path + '?' + require('querystring').stringify(request.query);
    status = status || '-';
    timestamp = (new Date()).toUTCString();
    userAgent = userAgent || '-';

    process.stdout.write(`${ip} [${timestamp}] "${method} ${path} HTTP/1.1" ${status} ${length} "${userAgent}"\n`);
  };

  /**
   * Handles errors that occur in the handler. Sets the response code based on
   * `err.status` and the message based on `err.message`. If either of these
   * are not set, uses default status/messages instead.
   *
   * @param err {Error}
   *     The error that occurred. If err.status and/or err.message are set then
   *     they are used for the response code/message respectively.
   * @param request {Express.request}
   * @param response {Express.response}
   * @param next {Function}
   */
  _this.onError = function (err, request, response/*, next*/) {
    var payload,
        status;

    payload = {
      request: _this.getResponseMetadata(request, false),
      response: (err && err.message) ? err.message : 'Internal Server Error'
    };

    status = (err && err.status) ? err.status : 500;

    _this.log(request, response, payload, status);

    if (err && err.stack) {
      process.stderr.write(err.stack + '\n');
    }

    response.status(status);
    response.json(payload);
  };

  /**
   * Sends the `data` encoded as a JSON string over the `response`. If no
   * data is received, the `request` falls through to be handled by the `next`
   * route in the pipeline.
   *
   * @param data {Object}
   * @param request {Express.Request}
   * @param response {Express.Response}
   * @param next {Function}
   *
   */
  _this.onSuccess = function (data, request, response, next) {
    var payload;

    if (data === null) {
      return next();
    }

    payload = {
      request: _this.getResponseMetadata(request, true),
      response: data
    };

    _this.log(request, response, payload, 200);
    response.json(payload);
  };

  /**
   * Sets CORS (and possibly other) headers on the `response`.
   *
   * @param response {Express.Response}
   */
  _this.setHeaders = function (response) {
    if (response) {
      response.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Method': '*',
        'Access-Control-Allow-Headers': [
          'accept',
          'origin',
          'authorization',
          'content-type'
        ].join(',')
      });
    }
  };

  /**
   * Start the web service in an express server.
   *
   */
  _this.start = function () {
    var app;

    app = express();

    // handle dynamic requests
    app.get(_mountPath + '/:method', _this.get);

    // rest fall through to htdocs as static content.
    app.use(_mountPath, express.static(_docRoot, {fallthrough: true}));

    // Final handler for 404 (no handler, no static file)
    app.get(_mountPath + '/:error', (req, res/*, next*/) => {
      var payload;

      payload = `Cannot GET ${req.path}`;
      _this.log(req, res, payload, 404);
      res.status(404);
      res.send(payload);
      res.end();
    });

    app.listen(_port, function () {
      process.stderr.write('WebService listening ' +
          'http://localhost:' + _port + _mountPath + '\n');
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = WebService;
