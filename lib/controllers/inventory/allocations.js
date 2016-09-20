// third-party
const Bluebird = require('bluebird');

module.exports = function (inventoryCtrl, cebola, options) {

  const Allocation = cebola.models.Allocation;

  /**
   * Auxiliary function that performs the summary computation
   * for both operations and allocations
   * 
   * @param  {[type]} model [description]
   * @param  {[type]} query [description]
   * @return {[type]}       [description]
   */
  inventoryCtrl.allocationsSummary = function (query) {
    var aggregation = Allocation.aggregate();

    query = query || {};

    // ensure only records with status set to
    // `effective` are taken into account
    query['status.value'] = SHARED_CONSTANTS.RECORD_STATUSES.EFFECTIVE;

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

  inventoryCtrl.shipmentAllocationsSummary = function (shipment, query) {
    query = query || {};

    query['shipment._id'] = shipment._id.toString();

    return inventoryCtrl.allocationsSummary(query);
  };

  inventoryCtrl.productAllocationsSummary = function (productModel, query) {
    query = query || {};

    query['productModel._id'] = productModel._id.toString();

    return inventoryCtrl.allocationsSummary(query);
  };
};
