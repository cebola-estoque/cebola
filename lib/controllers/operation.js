// third-party
const Bluebird = require('bluebird');
const moment = require('moment');

const errors = require('../errors');
const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const Operation = cebola.models.Operation;

  var operationCtrl = {};

  /**
   * Lists all operations associated to a given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Array[Operations]}
   */
  operationCtrl.listByShipment = function (shipment) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    var query = { 'shipment._id': shipment._id }

    return Operation.find(query);
  }

  /**
   * Registers an entry operation
   * 
   * @param  {Shipment} shipment
   * @param  {ProductModel} productModel
   * @param  {Date}         productExpiry
   * @param  {String}       quantityUnit
   * @param  {Number}       quantityValue
   * @return {Bluebird -> Operation}
   */
  operationCtrl.registerEntry = function (shipment, productModel, productExpiry, quantityUnit, quantityValue) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    if (!quantityValue || quantityValue <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'required'));
    }

    var operation = new Operation({
      productModel: {
        _id: productModel._id,
        description: productModel.description,
      },
      productExpiry: productExpiry,
      quantity: {
        unit: quantityUnit,
        value: quantityValue,
      }
    });

    operation.setShipment(shipment);

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
   * @param  {Shipment} shipment
   * @param  {ProductModel} productModel
   * @param  {Date}         productExpiry
   * @param  {String}       quantityUnit
   * @param  {Number}       quantityValue
   * @return {Bluebird -> Operation}
   */
  operationCtrl.registerExit = function (shipment, productModel, productExpiry, quantityUnit, quantityValue) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    if (!quantityValue || quantityValue >= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return operationCtrl.isProductInStock(
      productModel,
      productExpiry,
      quantityUnit,
      // Math.abs to convert to a positive number for availability verification
      Math.abs(quantityValue)
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        var operation = new Operation({
          productModel: {
            _id: productModel._id,
            description: productModel.description,
          },
          productExpiry: productExpiry,
          quantity: {
            unit: quantityUnit,
            value: quantityValue,
          }
        });

        operation.setShipment(shipment);

        return operation.save();
      }
    });
  };

  /**
   * Registers a loss of a given
   * ProductModel, productExpiry and quantityUnit
   * 
   * @param  {Object} lossData
   * @param  {ProductModel} productModel
   * @param  {Date}         productExpiry
   * @param  {String}       quantityUnit
   * @param  {Number}       quantityValue
   * @return {Bluebird -> Operation}
   */
  operationCtrl.registerLoss = function (productModel, productExpiry, quantityUnit, quantityValue) {
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    if (!quantityValue || quantityValue > 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return operationCtrl.isProductInStock(
      productModel,
      productExpiry,
      quantityUnit,
      // Math.abs to convert to a positive number for availability verification
      Math.abs(quantityValue)
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        var operation = new Operation({
          productModel: {
            _id: productModel._id,
            description: productModel.description,
          },
          productExpiry: productExpiry,
          quantity: {
            unit: quantityUnit,
            value: quantityValue,
          }
        });

        operation.set('type', CONSTANTS.OPERATION_TYPES.LOSS);

        return operation.save();
      }
    });
  };


  /**
   * Auxiliary function that performs the summary computation
   * for both operations and allocations
   * 
   * @param  {Object} query
   * @return {Bluebird -> Array}
   */
  operationCtrl.summary = Operation.summary.bind(Operation);

  /**
   * Computes a summary of operations related to the given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Summary}
   */
  operationCtrl.shipmentSummary = Operation.shipmentSummary.bind(Operation);

  /**
   * Computes a summary of operations related to the given
   * productModel, productExpury and quantityUnit
   * 
   * @param  {ProductModel} productModel
   * @param  {Date} productExpiry
   * @param  {String} quantityUnit
   * @return {Bluebird -> Summary}
   */
  operationCtrl.productSummary = Operation.productSummary.bind(Operation);

  /**
   * Checks whether there are at least `quantityValue` units
   * of a given productModel at a given productExpiry and quantityUnit
   * 
   * @param  {ProductModel} productModel
   * @param  {Date}         productExpiry
   * @param  {String}       quantityUnit
   * @param  {Number}       quantityValue
   * @return {Bluebird -> Boolean}
   */
  operationCtrl.isProductInStock = function (productModel, productExpiry, quantityUnit, quantityValue) {
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    if (!quantityValue || quantityValue <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return operationCtrl.productSummary(
      productModel,
      productExpiry,
      quantityUnit
    )
    .then((summary) => {

      if (summary.quantity.value < quantityValue) {
        return false;
      } else {
        return true;
      }
    });
  };

  return operationCtrl;
};
