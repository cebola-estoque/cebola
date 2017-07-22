// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;

  var allocationCtrl = {};
  
  allocationCtrl.getById = function (allocationId) {
    if (!allocationId) {
      return Bluebird.reject(new errors.InvalidOption('allocationId', 'required'));
    }
    
    return ProductAllocation.findById(allocationId).then((allocation) => {
      if (!allocation) {
        return Bluebird.reject(new errors.NotFound('allocation', allocationId));
      }
      
      return allocation;
    });
  };

  /**
   * Lists allocations for the given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Array[ProductAllocation]}
   */
  allocationCtrl.listByShipment = function (shipment, query) {
    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    query = query || {};

    Object.assign(query, {
      'shipment._id': shipment._id.toString()
    });

    return ProductAllocation.find(query);
  };

  /**
   * Allocates a given product for entry in the given shipment.
   * 
   * @param  {Shipment} shipment
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Number} allocatedQuantity
   * @return {Bluebird -> ProductAllocation}         
   */
  allocationCtrl.allocateEntry = function (shipment, product, allocatedQuantity) {
    
    var allocation = new ProductAllocation({
      product: product,
      allocatedQuantity: allocatedQuantity
    });

    allocation.setShipment(shipment);

    allocation.setStatus(
      CONSTANTS.ALLOCATION_STATUSES.ACTIVE,
      'Allocated'
    );

    return allocation.save();
  };

  /**
   * Allocates a given product for entry in the given shipment.
   * 
   * @param  {Shipment} shipment
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Number} allocatedQuantity
   * @return {Bluebird -> ProductAllocation}         
   */
  allocationCtrl.allocateExit = function (shipment, product, allocatedQuantity) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    var scheduledFor = shipment.scheduledFor;

    return cebola.inventory.isProductAvailable(
      product,
      Math.abs(allocatedQuantity),
      scheduledFor
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      } else {
        
        var allocation = new ProductAllocation({
          product: product,
          allocatedQuantity: allocatedQuantity,
        });

        allocation.setStatus(
          CONSTANTS.ALLOCATION_STATUSES.ACTIVE,
          'Allocated'
        );

        allocation.setShipment(shipment);

        return allocation.save();
      }
    })
  };

  /**
   * Cancels an allocation.
   * Cancelled allocations are not taken into account for inventory
   * counting.
   * 
   * @param  {ProductAllocation} allocation
   * @param  {String} reason
   * @return {Bluebird -> ProductAllocation}
   */
  allocationCtrl.cancel = function (allocation, reason) {
    allocation.setStatus(
      CONSTANTS.ALLOCATION_STATUSES.CANCELLED,
      reason
    );

    return allocation.save();
  };

  /**
   * Effectivates part of an allocation.
   *
   * Creates an operation and adds to the `effectivatedQuantity`
   * of the allocation.
   * 
   * @param  {ProductAllocation} allocation
   * @param  {Number} quantity
   * @return {Bluebird -> ProductOperation}
   */
  allocationCtrl.effectivateEntry = function (allocation, quantity) {

    if (!allocation) {
      return Bluebird.reject(new errors.InvalidOption('allocation', 'required'));
    }

    var operation = new ProductOperation({
      product: allocation.product,
      quantity: quantity,
    });

    operation.setSourceAllocation(allocation);

    operation.setStatus(
      CONSTANTS.OPERATION_STATUSES.ACTIVE,
      'EffectivatedFromAllocation'
    );

    return operation.save().then((operation) => {
      // TODO: handle errors: save them to a list of operations to be re-performed.
      return Bluebird.all([
        allocationCtrl._recalculateEffectivatedQuantity(allocation),
        allocationCtrl._updateShipmentStatus(
          allocation,
          CONSTANTS.SHIPMENT_STATUSES.IN_PROGRESS,
          'AllocationEffectivated'
        )
      ]);
    })
    .then((results) => {
      // return the allocation
      return results[0];
    });
  };

  allocationCtrl.effectivateExit = function (allocation, quantity) {
    if (!allocation) { return Bluebird.reject(new errors.InvalidOption('allocation', 'required')); }

    if (!quantity || quantity >= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return cebola.inventory.isProductInStock(
      allocation.product,
      // Math.abs to convert to a positive number for availability verification
      Math.abs(quantity)
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable());
      }

      var operation = new ProductOperation({
        product: allocation.product,
        quantity: quantity,
      });

      operation.setStatus(
        CONSTANTS.OPERATION_STATUSES.ACTIVE,
        'EffectivatedFromAllocation'
      );

      operation.setSourceAllocation(allocation);

      return operation.save();
    })
    .then(() => {
      // TODO: handle errors: save them to a list of operations to be re-performed.
      return Bluebird.all([
        allocationCtrl._recalculateEffectivatedQuantity(allocation),
        allocationCtrl._updateShipmentStatus(
          allocation,
          CONSTANTS.SHIPMENT_STATUSES.IN_PROGRESS,
          'AllocationEffectivated'
        )
      ]);
    })
    .then((results) => {
      // return the allocation
      return results[0];
    });
  };

  /**
   * Recalculates the amount of allocatedQuantity that was effectivated
   * 
   * @param  {ProductAllocation} allocation
   * @return {Bluebird -> ProductAllocation}
   */
  allocationCtrl._recalculateEffectivatedQuantity = function (allocation) {

    /**
     * Summarize all ProductOperations directly related
     * to the allocation and the allocation's product.
     *
     * ATTENTION: we use productSummary beacause it normalizes the array returned
     * by `summary` into a single object, so that we do not need to check
     * for cases when there is not operation related to the allocation and other
     * edge cases. Normalization is done at `productSummary` method.
     * 
     * @type {String}
     */
    return cebola.inventory.productSummary(allocation.product, {
      kind: 'ProductOperation',
      'sourceAllocation._id': allocation._id.toString(),
    })
    .then((summary) => {

      /**
       * `inStock` is the value for the sum of operations.
       * May be negative.
       */
      var effectivated = summary.inStock;

      allocation.set('effectivatedQuantity', effectivated);

      return allocation.save();
    });
  };
  
  /**
   * Updates the shipment associated to the allocation status
   * only in case the shipment's status is not already the 
   * required value.
   */
  allocationCtrl._updateShipmentStatus = function (allocation, status, reason) {
    return cebola.shipment.getById(allocation.shipment._id)
      .then((shipment) => {
        if (shipment.getStatus() !== status) {
          shipment.setStatus(status, reason);
          return shipment.save();
        } else {
          return shipment;
        }
      });
  };

  return allocationCtrl;
};
