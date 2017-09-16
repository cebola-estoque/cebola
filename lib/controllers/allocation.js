// third-party
const Bluebird = require('bluebird');
const clone    = require('clone');

const errors = require('../errors');

const CONSTANTS = require('../constants');
const util = require('../util');

module.exports = function (cebola, options) {

  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;

  let allocationCtrl = {};
  
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
      'shipment._id': util.normalizeObjectId(shipment._id),
    });

    return ProductAllocation.find(query);
  };

  /**
   * Allocates a given product for entry in the given shipment.
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   *         - sourceShipment
   * @param  {Number} allocatedQuantity
   * @param  {Shipment} entryShipment
   * @param  {Object} allocationData
   * @return {Bluebird -> ProductAllocation}
   */
  allocationCtrl.allocateEntry = function (product, allocatedQuantity, entryShipment, allocationData) {
    if (!allocatedQuantity || allocatedQuantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('allocatedQuantity', 'required'));
    }

    let entryShipmentData = (typeof entryShipment.toJSON === 'function') ?
      entryShipment.toJSON() : entryShipment;
    let allocation = new ProductAllocation(allocationData);

    allocation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY);

    allocation.set('allocatedQuantity', allocatedQuantity);

    allocation.set('shipment', entryShipmentData);
    allocation.set('scheduledFor', entryShipmentData.scheduledFor);
    allocation.set('product', product);

    // ensure the product.sourceShipment is set to the given entryShipment
    allocation.set('product.sourceShipment', entryShipmentData);

    allocation.setStatus(
      CONSTANTS.ALLOCATION_STATUSES.ACTIVE,
      'Allocated'
    );

    return allocation.save();
  };

  /**
   * Allocates a given product for entry in the given shipment.
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   *         - sourceShipment
   * @param  {Number} allocatedQuantity
   * @param  {Shipment} exitShipment
   * @return {Bluebird -> ProductAllocation}         
   */
  allocationCtrl.allocateExit = function (product, allocatedQuantity, exitShipment, allocationData) {
    if (!exitShipment) {
      return Bluebird.reject(new errors.InvalidOption('exitShipment', 'required'));
    }

    if (!allocatedQuantity || allocatedQuantity >= 0) {
      return Bluebird.reject(new errors.InvalidOption('allocatedQuantity', 'required'));
    }

    let exitShipmentData = (typeof exitShipment.toJSON === 'function') ?
      exitShipment.toJSON() : exitShipment;
    let scheduledFor = exitShipmentData.scheduledFor;

    return cebola.inventory.isProductAvailable(
      product,
      Math.abs(allocatedQuantity),
      scheduledFor
    )
    .then((available) => {

      if (!available) {
        return Bluebird.reject(new errors.ProductNotAvailable(product));
      } else {

        let allocation = new ProductAllocation(allocationData);

        allocation.set('type', CONSTANTS.PRODUCT_RECORD_TYPES.EXIT);

        allocation.set('product', product);
        allocation.set('allocatedQuantity', allocatedQuantity);

        allocation.set('shipment', exitShipmentData);
        allocation.set('scheduledFor', exitShipmentData.scheduledFor);

        allocation.setStatus(
          CONSTANTS.ALLOCATION_STATUSES.ACTIVE,
          'Allocated'
        );

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
  allocationCtrl.effectivateEntry = function (entryAllocation, effectivatedQuantity, operationData) {

    if (!entryAllocation) {
      return Bluebird.reject(new errors.InvalidOption('entryAllocation', 'required'));
    }

    let entryAllocationData = (typeof entryAllocation.toJSON === 'function') ?
      entryAllocation.toJSON() : entryAllocation;

    operationData = Object.assign({}, operationData, {
      type: CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY,
      sourceAllocation: entryAllocationData,
    });

    return cebola.operation.registerEntry(
      entryAllocationData.product,
      effectivatedQuantity,
      entryAllocationData.shipment,
      operationData
    )
    .then((operation) => {

      // TODO: handle errors: save them to a list of operations to be re-performed.
      return Bluebird.all([
        allocationCtrl._recalculateEffectivatedQuantity(entryAllocation),
        allocationCtrl._updateShipmentStatus(
          entryAllocation,
          CONSTANTS.SHIPMENT_STATUSES.IN_PROGRESS,
          'AllocationEffectivated'
        )
      ])
      .then(() => {
        return operation;
      });
    })
    // .then((results) => {
    //   // TODO: study returning the operation instead of the allocation
    //   // return the allocation
    //   return results[0];
    // });
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
  allocationCtrl.effectivateExit = function (exitAllocation, effectivatedQuantity, operationData) {
    if (!exitAllocation) {
      return Bluebird.reject(new errors.InvalidOption('exitAllocation', 'required'));
    }

    if (!effectivatedQuantity || effectivatedQuantity >= 0) {
      return Bluebird.reject(new errors.InvalidOption('effectivatedQuantity', 'required'));
    }

    let exitAllocationData = (typeof exitAllocation.toJSON === 'function') ?
      exitAllocation.toJSON() : exitAllocation;

    operationData = Object.assign({}, operationData, {
      type: CONSTANTS.PRODUCT_RECORD_TYPES.EXIT,
      sourceAllocation: exitAllocationData,
    });

    return cebola.operation.registerExit(
      exitAllocationData.product,
      effectivatedQuantity,
      exitAllocationData.shipment,
      operationData
    )
    .then((operation) => {
      // TODO: handle errors: save them to a list of operations to be re-performed.
      return Bluebird.all([
        allocationCtrl._recalculateEffectivatedQuantity(exitAllocation),
        allocationCtrl._updateShipmentStatus(
          exitAllocation,
          CONSTANTS.SHIPMENT_STATUSES.IN_PROGRESS,
          'AllocationEffectivated'
        )
      ])
      .then(() => {
        return operation;
      });
    })
    // .then((results) => {
    //   // return the allocation
    //   return results[0];
    // });
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
      'sourceAllocation._id': util.normalizeObjectId(allocation._id),
    })
    .then((summary) => {

      /**
       * `inStock` is the value for the sum of operations.
       * May be negative.
       */
      let effectivated = summary.inStock;

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
