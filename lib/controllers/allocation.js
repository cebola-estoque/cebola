// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const Allocation = cebola.models.Allocation;
  const Operation  = cebola.models.Operation;

  var allocationCtrl = {};

  allocationCtrl.allocateEntry = function (shipment, productModel, productExpiry, quantityUnit, quantityValue) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    if (!quantityValue || quantityValue <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'required'));
    }

    var allocation = new Allocation({
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

    allocation.setShipment(shipment);

    return allocation.save();
  };

  allocationCtrl.allocateExit = function (shipment, productModel, productExpiry, quantityUnit, quantityValue) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    if (!quantityValue || quantityValue >= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'required'));
    }

    var scheduledFor = shipment.scheduledFor;

    return allocationCtrl.isProductAvailable(
      productModel,
      productExpiry,
      quantityUnit,
      Math.abs(quantityValue),
      scheduledFor
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        var allocation = new Allocation({
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

    return Allocation.find(query);
  };

  allocationCtrl.summary = Allocation.summary.bind(Allocation);

  allocationCtrl.shipmentSummary = Allocation.shipmentSummary.bind(Allocation);
  allocationCtrl.productSummary = Allocation.productSummary.bind(Allocation);

  /**
   * Computes the amount in stock of a given
   * product and the amount allocated for exit of that same product.
   *
   * Returns the resulting sum, to be considered as the amount
   * of the given product that is still available for exit allocations.
   *
   * `product` is identified by the triad productModel-productExpiry-quantityUnit
   * 
   * @param  {ProductModel} productModel
   * @param  {Date} productExpiry
   * @param  {String} quantityUnit
   * @param  {Date} targetDate
   * @return {Bluebird -> Number}
   */
  allocationCtrl.computeProductAvailability = function (productModel, productExpiry, quantityUnit, targetDate) {
    if (!targetDate) { return Bluebird.reject(new errors.InvalidOption('targetDate', 'required')); }

    // retrieve operations and allocations summaries for the product
    return Bluebird.all([
      Allocation.productSummary(productModel, productExpiry, quantityUnit, {
        // take into account either exit allocations
        // or entry allocations up to the given date.
        $or: [
          {
            type: CONSTANTS.ALLOCATION_TYPES.EXIT,
          },
          {
            type: CONSTANTS.ALLOCATION_TYPES.ENTRY,
            scheduledFor: {
              $lt: targetDate,
            }
          }
        ],
      }),
      Operation.productSummary(productModel, productExpiry, quantityUnit)
    ])
    .then((summaries) => {

      var allocationsSummary = summaries[0];
      var operationsSummary  = summaries[1];

      return operationsSummary.quantity.value + allocationsSummary.quantity.value;
    });
  };

  /**
   * Checks whether a given quantity of the given productModel-productExpiery-quantityUnit
   * is available for allocation.
   * 
   * @param  {ProductModel}  productModel
   * @param  {Date}  productExpiry
   * @param  {String}  quantityUnit
   * @param  {Number}  quantityValue
   * @param  {Date} targetDate
   * @return {Bluebird -> Boolean}
   */
  allocationCtrl.isProductAvailable = function (productModel, productExpiry, quantityUnit, quantityValue, targetDate) {

    if (!quantityValue || quantityValue <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'invalid'));
    }

    if (!targetDate) {
      return Bluebird.reject(new errors.InvalidOption('targetDate', 'invalid'));
    }

    return allocationCtrl.computeProductAvailability(
      productModel,
      productExpiry,
      quantityUnit,
      targetDate
    )
    .then((availableUnits) => {
      if (availableUnits < quantityValue) {
        return false;
      } else {
        return true;
      }
    });
  };

  return allocationCtrl;
};
