// third-party
const Bluebird = require('bluebird');
const moment = require('moment');
const clone  = require('clone');

const errors = require('../errors');
const util   = require('../util');
const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductOperation = cebola.models.ProductOperation;

  let operationCtrl = {};

  operationCtrl.list = function (query) {
    query = query || {};

    return ProductOperation.find(query);
  };

  operationCtrl.listByProduct = function (product) {
    if (!product) { return Bluebird.reject(new errors.InvalidOption('product', 'required')); }

    let query = {
      'product.model._id': product.model._id,
      'product.expiry': product.expiry,
      'product.measureUnit': product.measureUnit,
      'product.sourceShipment._id': product.sourceShipment._id,
    };

    return operationCtrl.list(query);
  };

  /**
   * Lists all operations associated to a given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Array[ProductOperations]}
   */
  operationCtrl.listByShipment = function (shipment) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    let query = { 'shipment._id': util.normalizeObjectId(shipment._id) }

    return operationCtrl.list(query);
  };

  /**
   * Registers an entry operation
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   *         - sourceShipment
   * @param  {Shipment} entryShipment
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerEntry = function (product, quantity, entryShipment, operationData) {
    if (!quantity || quantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    let operation = new ProductOperation(operationData);

    operation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY);

    operation.set('product', product);
    operation.set('quantity', quantity);

    if (entryShipment) {
      let entryShipmentData = (typeof entryShipment.toJSON === 'function') ?
        entryShipment.toJSON() : entryShipment;

      /**
       * Entry operations are not tightly related to an entry shipment,
       * as there can be correction entry shipments.
       *
       * In case the entry operation is related to an entry shipment,
       * ensure that the product's sourceShipment is exactly the
       * same as the entryShipment related to this operation.
       */
      operation.set('shipment', entryShipmentData);
      operation.set('product.sourceShipment', entryShipmentData);
    }

    operation.setStatus(
      CONSTANTS.OPERATION_STATUSES.ACTIVE,
      'Registered'
    );

    return operation.save();
  };

  /**
   * Registers an exit for the
   *   - given productModel
   *   - at the given productExpiry
   *   - measured by the given quantity unit
   *
   * Before registering the exit, checks for the product availability.
   * In case the quantity requested is not available, rejects
   * with `ProductNotAvailable` error.
   *
   * It is very important to note that the check is done at application level
   * and not database level, which risks two concurrent writes to generate data
   * inconsistency. This inconsistency should be dealt with at the application
   * level as well. In other words: the availability check is not a validation,
   * as it cannot be assured to be effective in high concurrency, but should be
   * considered a helper that will diminish mistakes.
   *
   * It is very important for the inconsistencies to be dealt with by the end user.
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   *         - sourceShipment
   * @param  {Number}   quantity
   * @param  {Shipment} exitShipment
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerExit = function (product, quantity, exitShipment, operationData) {
    if (!quantity || quantity >= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return cebola.inventory.isProductInStock(
      product,
      // Math.abs to convert to a positive number for availability verification
      Math.abs(quantity)
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable(product));
      } else {
        let operation = new ProductOperation(operationData);

        operation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.EXIT);

        operation.set('product', product);
        operation.set('quantity', quantity);

        operation.setStatus(
          CONSTANTS.OPERATION_STATUSES.ACTIVE,
          'Registered'
        );

        if (exitShipment) {
          let exitShipmentData = (typeof exitShipment.toJSON === 'function') ?
            exitShipment.toJSON() : exitShipment;

          operation.set('shipment', exitShipmentData);
        }

        return operation.save();
      }
    });
  };

  /**
   * Registers a loss of a given product
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   *         - sourceShipment
   * @param  {Number} quantity
   * @param  {Object} operationData
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerLoss = function (product, quantity, operationData) {
    if (!quantity || quantity > 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
    }

    operationData = Object.assign({}, operationData, {
      category: CONSTANTS.OPERATION_CATEGORIES.LOSS,
    });

    return operationCtrl.registerExit(product, quantity, null, operationData);
  };

  /**
   * Registers a correction for a given product
   *
   * In case the correction is `negative`, will check whether the corrected
   * amount is in stock prior to registering.
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   *         - sourceShipment
   * @param  {Number} quantity
   * @param  {Object} operationData
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerCorrection = function (product, quantity, operationData) {
    if (!quantity) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
    }

    operationData = Object.assign({}, operationData, {
      category: CONSTANTS.OPERATION_CATEGORIES.CORRECTION
    });

    return quantity > 0 ?
      operationCtrl.registerEntry(product, quantity, null, operationData) :
      operationCtrl.registerExit(product, quantity, null, operationData);
  };

  /**
   * Cancels an operation.
   * Cancelled operations are not taken into account for inventory
   * counting.
   * 
   * @param  {ProductOperation} operation
   * @param  {String} reason
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.cancel = function (operation, reason) {
    operation.setStatus(
      CONSTANTS.OPERATION_STATUSES.CANCELLED,
      reason
    );

    return operation.save();
  };

  return operationCtrl;
};
