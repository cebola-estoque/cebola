// native
const EventEmitter = require('events').EventEmitter;

// third-party
const Bluebird = require('bluebird');

const errors = require('./errors');
const makeModels = require('./models');

const CONSTANTS = require('./constants');

/**
 * Function that creates a fully operational
 * cebola instance.
 * 
 * @param  {MongooseConnection} connection
 * @param  {Object} options
 * @return {Object}
 */
var makeCebola = function (connection, options) {

  /**
   * Singleton of cebola.
   * 
   * @type {EventEmitter}
   */
  var cebola = new EventEmitter();

  /**
   * Cebola models
   * @type {Object}
   */
  cebola.models = makeModels(connection, options);

  /**
   * Controllers are exposed directly in the main cebola instance.
   * 
   * @type {Object}
   */
  Object.assign(cebola, require('./controllers')(cebola, options));

  // return a promise from the start so that
  // we can modify the api in the future with
  // easy backward compatibility
  return Bluebird.resolve(cebola);
};

/**
 * Expose the model making function as a standalone method.
 * 
 * @type {Function}
 */
makeCebola.makeModels = makeModels;

/**
 * Expose constants
 * @type {Object}
 */
makeCebola.constants = CONSTANTS;

/**
 * Expose errors in the makeCebola function
 * @type {Object}
 */
makeCebola.errors = errors;

module.exports = makeCebola;
