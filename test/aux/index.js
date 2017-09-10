// native dependencies
const path = require('path');
const http = require('http');

// third-party dependencies
const MongoClient = require('mongodb').MongoClient;
const mongoose    = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

mongoose.Promise = Bluebird;

if (process.env.DEBUG === 'TRUE') {
  // set mongoose to debug mode
  require('mongoose').set('debug', true);
}

const TEST_DB_URI = 'mongodb://localhost:27017/cebola-test-db';

exports.mockData = require('./mock-data');

/**
 * Helper function that checks whether two products are the same.
 * @param  {Product} p1
 * @param  {Product} p2
 * @return {Boolean}   
 */
exports.areSameProduct = function (p1, p2) {
  var isSameModel       = p1.model._id   === p2.model._id;
  var isSameMeasureUnit = p1.measureUnit === p2.measureUnit;
  var isSameExpiry      = moment(p1.expiry).isSame(moment(p2.expiry).endOf('day'));

  return (isSameModel && isSameMeasureUnit && isSameExpiry);
};

exports.logError = function (err) {
  console.warn(err);

  throw err;
};

exports.defaultOptions = {};

exports.genOptions = function (opts) {
  return Object.assign({}, exports.defaultOptions, opts);
};

exports.dbURI = TEST_DB_URI;

/**
 * Used to reject successful promises that should have not been fulfilled
 * @return {Bluebird Rejection}
 */
exports.errorExpected = function () {
  return Bluebird.reject(new Error('error expected'));
};

/**
 * Sets up an assets object that is ready for the tests
 * @return {[type]} [description]
 */
exports.setup = function () {

  var _assets = {
    dbURI: TEST_DB_URI,
    connection: mongoose.createConnection(TEST_DB_URI),
  };
  
  return MongoClient.connect(TEST_DB_URI)
    .then((db) => {

      _assets.db = db;

      // register teardown
      exports.registerTeardown(function () {

        // drop database
        return _assets.db.dropDatabase().then(() => {
          return _assets.db.close();
        });
      });

      return _assets.db.dropDatabase();
    })
    .then(() => {

      // always return the assets object
      return _assets;
    });
};

var TEARDOWN_CALLBACKS = [];

/**
 * Register a teardown function to be executed by the teardown
 * The function should return a promise
 */
exports.registerTeardown = function (teardown) {
  TEARDOWN_CALLBACKS.push(teardown);
};

/**
 * Executes all functions listed at TEARDOWN_CALLBACKS
 */
exports.teardown = function () {
  return Promise.all(TEARDOWN_CALLBACKS.map((fn) => {
    return fn();
  }))
  .then(() => {
    TEARDOWN_CALLBACKS = [];
  })
  .catch((err) => {
    console.warn(err);
    throw err;
  });
};
