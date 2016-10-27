// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductRecord     = cebola.models.ProductRecord;
  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;

  var inventoryCtrl = {};

  inventoryCtrl.summary = ProductAllocation.summary.bind(ProductAllocation);
  
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
  inventoryCtrl.productAvailability = function (productModel, productExpiry, quantityUnit, targetDate) {
    if (!targetDate) { return Bluebird.reject(new errors.InvalidOption('targetDate', 'required')); }

    return ProductRecord.productSummary(productModel, productExpiry, quantityUnit, {
      // take into account
      //   - all operations
      //   - exit allocations
      //   - entry allocations up to the targetDate
      $or: [
        {
          kind: 'ProductOperation',
        },
        {
          kind: 'ProductAllocation',
          type: CONSTANTS.ALLOCATION_TYPES.EXIT,
        },
        {
          kind: 'ProductAllocation',
          type: CONSTANTS.ALLOCATION_TYPES.ENTRY,
          scheduledFor: {
            $lt: targetDate,
          }
        }
      ],
    })
    .then((summary) => {
      return summary.quantity.value;
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
  inventoryCtrl.isProductAvailable = function (productModel, productExpiry, quantityUnit, quantityValue, targetDate) {

    if (!quantityValue || quantityValue <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantityValue', 'invalid'));
    }

    if (!targetDate) {
      return Bluebird.reject(new errors.InvalidOption('targetDate', 'invalid'));
    }

    return inventoryCtrl.productAvailability(
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

  return inventoryCtrl;
};
