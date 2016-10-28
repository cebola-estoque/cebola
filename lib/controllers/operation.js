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

    var query = { 'shipment._id': shipment._id.toString(), }

    return ProductOperation.find(query);
  };

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
  operationCtrl.registerEntry = function (product, quantity, operationData) {
    if (!quantity || quantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    var operation = new ProductOperation(operationData);

    operation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY);

    operation.set('product', product);
    operation.set('quantity', quantity);

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
   * @param  {Shipment} shipment
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Number}       quantity
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerExit = function (product, quantity, operationData) {
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
        var operation = new ProductOperation(operationData);

        operation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.EXIT);

        operation.set('product', product);
        operation.set('quantity', quantity);

        operation.setStatus(
          CONSTANTS.OPERATION_STATUSES.ACTIVE,
          'Registered'
        );

        return operation.save();
      }
    });
  };

  /**
   * Registers a loss of a given
   * ProductModel, productExpiry and quantityUnit
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Number} quantity
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerLoss = function (product, quantity) {
    if (!quantity || quantity > 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
    }

    return operationCtrl.registerExit(product, quantity, {
      category: CONSTANTS.OPERATION_CATEGORIES.LOSS,
    });

    // // check availability of the given product model
    // // with the given productExpiry and given quantity unit
    // return cebola.inventory.isProductInStock(
    //   product,
    //   // Math.abs to convert to a positive number for availability verification
    //   Math.abs(quantity)
    // )
    // .then((available) => {

    //   if (!available) {
    //     return Bluebird.reject(new errors.ProductNotAvailable());
    //   } else {
    //     var operation = new ProductOperation({
    //       product: product,
    //       quantity: quantity,
    //     });

    //     operation.setStatus(
    //       CONSTANTS.OPERATION_STATUSES.ACTIVE,
    //       'Registered'
    //     );

    //     operation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.EXIT);

    //     operation.set('category', CONSTANTS.OPERATION_CATEGORIES.LOSS);

    //     return operation.save();
    //   }
    // });
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
   * @param  {Number} quantity
   * @return {Bluebird -> ProductOperation}
   */
  operationCtrl.registerCorrection = function (product, quantity) {
    if (!quantity) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
    }

    var verificationPromise;

    if (quantity > 0) {
      // no verification needed
      verificationPromise = Bluebird.resolve();

    } else if (quantity < 0) {
      // check if product is in stock before registering negative correction
      verificationPromise = cebola.inventory.isProductInStock(
        product,
        // Math.abs to convert to a positive number for availability verification
        Math.abs(quantity)
      )
      .then((available) => {
        if (!available) {
          return Bluebird.reject(new errors.ProductNotAvailable());
        }

        return;
      });
    }

    return verificationPromise.then(() => {
      var operation = new ProductOperation({
        product: product,
        quantity: quantity,
      });

      operation.setStatus(
        CONSTANTS.OPERATION_STATUSES.ACTIVE,
        'Registered'
      );

      var type = quantity > 0 ? 
        CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY :
        CONSTANTS.PRODUCT_RECORD_TYPES.EXIT;

      operation.set('type', type);

      operation.set('category', CONSTANTS.OPERATION_CATEGORIES.CORRECTION);

      return operation.save();
    });

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
