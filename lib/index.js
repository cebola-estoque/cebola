// native
const EventEmitter = require('events').EventEmitter;

// third-party
const Bluebird      = require('bluebird');
const autoIncrement = require('mongoose-auto-increment');

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
let makeCebola = function (connection, options) {

  options = options || {};

  /**
   * Singleton of cebola.
   * 
   * @type {EventEmitter}
   */
  let cebola = new EventEmitter();

  /**
   * Expose constants
   */
  cebola.constants = CONSTANTS;

  /**
   * Initialize autoincrement
   *
   * TODO: internalize autoincrement into configurations and
   * stop using 3rd party plugin
   */
  autoIncrement.initialize(connection);
  cebola._autoIncrement = autoIncrement;

  /**
   * Cebola models
   * @type {Object}
   */
  cebola.models = makeModels(connection, cebola, options);

  /**
   * Controllers are exposed directly in the main cebola instance.
   * 
   * @type {Object}
   */
  Object.assign(cebola, require('./controllers')(cebola, options));

  return cebola;
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

/**
 * Utilities
 */
makeCebola.util = require('./util');

module.exports = makeCebola;
