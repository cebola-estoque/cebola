// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const Operation  = cebola.models.Operation;
  const Allocation = cebola.models.Allocation;

  var inventoryCtrl = {};

  /**
   * Auxiliary function that performs the summary computation
   * for both operations and allocations
   * 
   * @param  {[type]} model [description]
   * @param  {[type]} query [description]
   * @return {[type]}       [description]
   */
  function _computeSummary(model, query) {
    var aggregation = Operation.aggregate();

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
  }

  inventoryCtrl.operationsSummary = function (query) {

    return _computeSummary(Operation, query);
  };


  inventoryCtrl.allocationsSummary = function (query) {
    return _computeSummary(Allocation, query);
  };


  inventoryCtrl.productAllocationsSummary = function (productModel, query) {
    query = query || {};

    query['productModel._id'] = productModel._id.toString();

    return inventoryCtrl.allocationsSummary(query);
  };

  inventoryCtrl.productOperationsSummary = function (productModel, query) {
    query = query || {};

    query['productModel._id'] = productModel._id.toString();

    return inventoryCtrl.operationsSummary(query);
  };


  inventoryCtrl.productAvailability = function (productModel, productExpiry, requestedQuantity) {

    // normalize the product expiry to the end of the day
    // convert the moment.js date into a native JS Date
    productExpiry = moment(productExpiry).endOf('day').toDate();


    return Bluebird.all([
      inventoryCtrl.productAllocationsSummary(productModel, {
        productExpiry: productExpiry,
        'quantity.unit': requestedQuantity.unit,
      }),
      inventoryCtrl.productOperationsSummary(productModel, {
        productExpiry: productExpiry,
        'quantity.unit': requestedQuantity.unit,
      })
    ])
    .then((results) => {

      var allocationsSummary = results;
      var operationsSummary  = results;

      if (operationsSummary.length === 0) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

      if (operationsSummary[0].quantity.value > Math.abs(requestedQuantity.value)) {
        return {
          available: true,
          summary: operationsSummary,
        }
      } else {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

    });
  };
  return inventoryCtrl;
};
