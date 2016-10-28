// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;

  var allocationCtrl = {};

  allocationCtrl.allocateEntry = function (shipment, product, quantity) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    if (!quantity || quantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    var allocation = new ProductAllocation({
      product: product,
      quantity: quantity
    });

    allocation.setShipment(shipment);

    return allocation.save();
  };

  allocationCtrl.allocateExit = function (shipment, product, quantity) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    if (!quantity || quantity >= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    var scheduledFor = shipment.scheduledFor;

    return cebola.inventory.isProductAvailable(
      product,
      Math.abs(quantity),
      scheduledFor
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        var allocation = new ProductAllocation({
          product: product,
          quantity: quantity,
        });

        allocation.setShipment(shipment);

        return allocation.save();
      }
    })
  };

  allocationCtrl.listByShipment = function (shipment) {
    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    var query = { 'shipment._id': shipment._id };

    return ProductAllocation.find(query);
  };

  // allocationCtrl.summary = ProductAllocation.summary.bind(ProductAllocation);

  // allocationCtrl.shipmentSummary = ProductAllocation.shipmentSummary.bind(ProductAllocation);
  // allocationCtrl.productSummary = ProductAllocation.productSummary.bind(ProductAllocation);

  // /**
  //  * Computes the amount in stock of a given
  //  * product and the amount allocated for exit of that same product.
  //  *
  //  * Returns the resulting sum, to be considered as the amount
  //  * of the given product that is still available for exit allocations.
  //  *
  //  * `product` is identified by the triad productModel-productExpiry-quantityUnit
  //  * 
  //  * @param  {ProductModel} productModel
  //  * @param  {Date} productExpiry
  //  * @param  {String} quantityUnit
  //  * @param  {Date} targetDate
  //  * @return {Bluebird -> Number}
  //  */
  // allocationCtrl.computeProductAvailability = function (productModel, productExpiry, quantityUnit, targetDate) {
  //   if (!targetDate) { return Bluebird.reject(new errors.InvalidOption('targetDate', 'required')); }

  //   // retrieve operations and allocations summaries for the product
  //   return Bluebird.all([
  //     ProductAllocation.productSummary(productModel, productExpiry, quantityUnit, {
  //       // take into account either exit allocations
  //       // or entry allocations up to the given date.
  //       $or: [
  //         {
  //           type: CONSTANTS.ALLOCATION_TYPES.EXIT,
  //         },
  //         {
  //           type: CONSTANTS.ALLOCATION_TYPES.ENTRY,
  //           scheduledFor: {
  //             $lt: targetDate,
  //           }
  //         }
  //       ],
  //     }),
  //     ProductOperation.productSummary(productModel, productExpiry, quantityUnit)
  //   ])
  //   .then((summaries) => {

  //     var allocationsSummary = summaries[0];
  //     var operationsSummary  = summaries[1];

  //     return operationsSummary.quantity.value + allocationsSummary.quantity.value;
  //   });
  // };

  // /**
  //  * Checks whether a given quantity of the given productModel-productExpiery-quantityUnit
  //  * is available for allocation.
  //  * 
  //  * @param  {ProductModel}  productModel
  //  * @param  {Date}  productExpiry
  //  * @param  {String}  quantityUnit
  //  * @param  {Number}  quantity
  //  * @param  {Date} targetDate
  //  * @return {Bluebird -> Boolean}
  //  */
  // allocationCtrl.isProductAvailable = function (productModel, productExpiry, quantityUnit, quantity, targetDate) {

  //   if (!quantity || quantity <= 0) {
  //     return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
  //   }

  //   if (!targetDate) {
  //     return Bluebird.reject(new errors.InvalidOption('targetDate', 'invalid'));
  //   }

  //   return allocationCtrl.computeProductAvailability(
  //     productModel,
  //     productExpiry,
  //     quantityUnit,
  //     targetDate
  //   )
  //   .then((availableUnits) => {
  //     if (availableUnits < quantity) {
  //       return false;
  //     } else {
  //       return true;
  //     }
  //   });
  // };

  return allocationCtrl;
};
