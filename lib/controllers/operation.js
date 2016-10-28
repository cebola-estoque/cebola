// third-party
const Bluebird = require('bluebird');
const moment = require('moment');

const errors = require('../errors');
const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductOperation = cebola.models.ProductOperation;

  var operationCtrl = {};

  /**
   * Lists all operations associated to a given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Array[ProductOperations]}
   */
  operationCtrl.listByShipment = function (shipment) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    var query = { 'shipment._id': shipment._id }

    return ProductOperation.find(query);
  }

  /**
   * Registers an entry operation
   * 
   * @param  {Shipment} shipment
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerEntry = function (shipment, product, quantity) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    if (!quantity || quantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    var operation = new ProductOperation({
      product: product,
      quantity: quantity,
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
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Number}       quantity
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerExit = function (shipment, product, quantity) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

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
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        var operation = new ProductOperation({
          product: product,
          quantity: quantity,
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
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerLoss = function (product, quantity) {
    if (!quantity || quantity > 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
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
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        var operation = new ProductOperation({
          product: product,
          quantity: quantity,
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
  // operationCtrl.summary = ProductOperation.summary.bind(ProductOperation);

  /**
   * Computes a summary of operations related to the given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Summary}
   */
  // operationCtrl.shipmentSummary = ProductOperation.shipmentSummary.bind(ProductOperation);

  /**
   * Computes a summary of operations related to the given
   * productModel, productExpury and quantityUnit
   * 
   * @param  {ProductModel} productModel
   * @param  {Date} productExpiry
   * @param  {String} quantityUnit
   * @return {Bluebird -> Summary}
   */
  // operationCtrl.productSummary = ProductOperation.productSummary.bind(ProductOperation);

  // /**
  //  * Checks whether there are at least `quantity` units
  //  * of a given productModel at a given productExpiry and quantityUnit
  //  * 
  //  * @param  {ProductModel} productModel
  //  * @param  {Date}         productExpiry
  //  * @param  {String}       quantityUnit
  //  * @param  {Number}       quantity
  //  * @return {Bluebird -> Boolean}
  //  */
  // operationCtrl.isProductInStock = function (productModel, productExpiry, quantityUnit, quantity) {
  //   if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
  //   if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
  //   if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

  //   if (!quantity || quantity <= 0) {
  //     return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
  //   }

  //   // check availability of the given product model
  //   // with the given productExpiry and given quantity unit
  //   return operationCtrl.productSummary(
  //     productModel,
  //     productExpiry,
  //     quantityUnit
  //   )
  //   .then((summary) => {

  //     if (summary.quantity.value < quantity) {
  //       return false;
  //     } else {
  //       return true;
  //     }
  //   });
  // };

  return operationCtrl;
};
