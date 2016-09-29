// third-party
const Bluebird = require('bluebird');
const moment = require('moment');

const errors = require('../errors');
const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const Operation = cebola.models.Operation;

  var operationCtrl = {};

  operationCtrl.listByShipment = function (shipment) {
    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    var query = { 'shipment._id': shipment._id }

    return Operation.find(query);
  }

  operationCtrl.registerEntry = function (shipment, operationData) {
    var operation = new Operation(operationData);

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
   * @param  {Object} operationData
   *         - productModel
   *           - _id
   *           - description
   *         - productExpiry
   *         - quantity
   *           - value
   *           - unit
   * @return {Bluebird -> Operation}
   */
  operationCtrl.registerExit = function (shipment, operationData) {

    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    if (!operationData ||
        !operationData.productModel ||
        !operationData.productExpiry ||
        !operationData.quantity) {
      return Bluebird.reject(new errors.InvalidOption('operationData', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return operationCtrl.productSummary(
      operationData.productModel,
      operationData.productExpiry,
      operationData.quantity.unit
    )
    .then((summary) => {

      if (summary.length === 0) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

      if (summary[0].quantity.value < Math.abs(operationData.quantity.value)) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

      var operation = new Operation(operationData);

      operation.setShipment(shipment);

      return operation.save();
    });
  };

  operationCtrl.registerLoss = function (lossData) {

    if (!lossData ||
        !lossData.productModel ||
        !lossData.productExpiry ||
        !lossData.quantity) {
      return Bluebird.reject(new errors.InvalidOption('lossData', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return operationCtrl.productSummary(
      lossData.productModel,
      lossData.productExpiry,
      lossData.quantity.unit
    )
    .then((summary) => {

      if (summary.length === 0) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

      if (summary[0].quantity.value < Math.abs(lossData.quantity.value)) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

      var operation = new Operation(lossData);

      operation.set('type', CONSTANTS.OPERATION_TYPES.LOSS);

      return operation.save();
    });
  };


  /**
   * Auxiliary function that performs the summary computation
   * for both operations and allocations
   * 
   * @param  {Object} query
   * @return {Bluebird -> Array}
   */
  operationCtrl.summary = function (query) {
    var aggregation = Operation.aggregate();

    query = query || {};

    // ensure only records with status set to
    // `effective` are taken into account
    // query['status.value'] = SHARED_CONSTANTS.RECORD_STATUSES.EFFECTIVE;

    // match the aggregation query
    aggregation.match(query);

    // sort by productExpiry
    aggregation.sort({
      productExpiry: -1,
    });

    aggregation.group({
      _id: {
        productModelId: '$productModel._id',
        productExpiry: '$productExpiry',
        quantityUnit: '$quantity.unit',
      },

      quantityValue: {
        $sum: '$quantity.value',
      },

      productModel: {
        $last: '$productModel',
      },
    });

    // filter out productModels with quantity 0
    // ATTENTION: this `match` operation is purposely
    // run AFTER the grouping operation, so that
    // it matches against the results from the grouping phase
    aggregation.match({
      'quantityValue': { $gt: 0 }
    });

    // project the results to be returned as the LAST step
    aggregation.project({
      _id: 0,
      productModel: 1,
      'quantity.value': '$quantityValue',
      'quantity.unit': '$_id.quantityUnit',
      productExpiry: '$_id.productExpiry',
    });

    return aggregation.exec();
  };

  operationCtrl.shipmentSummary = function (shipment, query) {

    query = query || {};

    query['shipment._id'] = shipment._id.toString();

    return operationCtrl.summary(query);
  };

  operationCtrl.productSummary = function (productModel, productExpiry, quantityUnit, query) {
    if (!productModel) {
      return Bluebird.reject(new errors.InvalidOption('productModel', 'required'));
    }

    query = query || {};

    query['productModel._id'] = productModel._id.toString();

    if (productExpiry) {
      // ensure the product expiry is at the right format
      query['productExpiry'] = Operation.makeProductExpiryDate(productExpiry);
    }

    if (quantityUnit) {
      query['quantity.unit'] = quantityUnit;
    }

    return operationCtrl.summary(query);
  };

  return operationCtrl;
};
