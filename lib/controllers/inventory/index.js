// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {
  var inventoryCtrl = {};

  require('./allocations')(inventoryCtrl, cebola, options);
  require('./operations')(inventoryCtrl, cebola, options);

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
