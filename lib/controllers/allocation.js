// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

module.exports = function (cebola, options) {

  const Allocation = cebola.models.Allocation;

  var allocationCtrl = {};

  allocationCtrl.allocate = function (shipment, allocationData) {
    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    if (!allocationData) {
      return Bluebird.reject(new errors.InvalidOption('allocationData', 'required'));
    }

    var allocation = new Allocation(allocationData);
    allocation.setShipment(shipment);

    return allocation.save();
  };

  allocationCtrl.listByShipment = function (shipment) {
    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    var query = { 'shipment._id': shipment._id };

    return Allocation.find(query);
  };

  /**
   * Auxiliary function that performs the summary computation
   * for both operations and allocations
   * 
   * @param  {[type]} model [description]
   * @param  {[type]} query [description]
   * @return {[type]}       [description]
   */
  allocationCtrl.summary = function (query) {
    var aggregation = Allocation.aggregate();

    query = query || {};

    // ensure only records with status set to
    // `effective` are taken into account
    // query['status.value'] = CONSTANTS.ALLOCATION_STATUSES.SCHEDULED;

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
      type: 1,
      'quantity.value': '$quantityValue',
      'quantity.unit': '$_id.quantityUnit',
      productExpiry: '$_id.productExpiry',
    });

    return aggregation.exec();
  };

  allocationCtrl.shipmentSummary = function (shipment, query) {

    query = query || {};

    query['shipment._id'] = shipment._id.toString();

    return allocationCtrl.summary(query);
  };

  allocationCtrl.productSummary = function (productModel, productExpiry, quantityUnit, query) {
    if (!productModel) {
      return Bluebird.reject(new errors.InvalidOption('productModel', 'required'));
    }

    query = query || {};

    query['productModel._id'] = productModel._id.toString();

    if (productExpiry) {
      // ensure the product expiry is at the right format
      query['productExpiry'] = Allocation.makeProductExpiryDate(productExpiry);
    }

    if (quantityUnit) {
      query['quantity.unit'] = quantityUnit;
    }

    return allocationCtrl.summary(query);
  };

  return allocationCtrl;
};
