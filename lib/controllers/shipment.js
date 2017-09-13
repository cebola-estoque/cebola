// third-party
const Bluebird = require('bluebird');
const moment   = require('moment');

const errors = require('../errors');
const util   = require('../util');
const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const errors = require('../errors');

  const ProductRecord     = cebola.models.ProductRecord;
  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;
  const Shipment          = cebola.models.Shipment;

  let shipmentCtrl = {};

  /**
   * Entry scheduling has a difference from exit scheduling
   * as entry scheduling does not demand any kind of verification
   * as (for now) there is no physical limitation to how
   * many units it is possible to store.
   * 
   * @param  {Organization} supplier
   * @param  {Object} shipmentData
   * @param  {Array} allocationsData
   * @return {Shipment}
   */
  shipmentCtrl.scheduleEntry = function (supplier, entryShipmentData, allocationsData) {

    if (!supplier) {
      return Bluebird.reject(new errors.InvalidOption('supplier is required'));
    }

    if (!entryShipmentData) {
      return Bluebird.reject(new errors.InvalidOption('entryShipmentData is required'));
    }

    allocationsData = allocationsData || [];

    let entryShipment = new Shipment(entryShipmentData);

    entryShipment.set('type', 'entry');
    entryShipment.setSupplier(supplier);

    entryShipment.setStatus(cebola.constants.SHIPMENT_STATUSES.SCHEDULED, 'NewlyCreated');

    return entryShipment.save()
      .then((entryShipment) => {

        // create the allocations
        return Bluebird.all(allocationsData.map((aData) => {
          return cebola.allocation.allocateEntry(
            aData.product,
            aData.allocatedQuantity,
            entryShipment
          );
        }));
      })
      .then((allocations) => {
        return entryShipment;
      })
      .catch((err) => {
        // TODO:
        // revert everything
        console.log(err);

        throw err;
      });

  };

  /**
   * Exit scheduling MUST take into account the quantity available
   * prior to saving the requested quantity.
   * 
   * @param  {Organization} recipient
   * @param  {Object} shipmentData
   * @param  {Array} allocationsData
   * @return {Shipment}
   */
  shipmentCtrl.scheduleExit = function (recipient, exitShipmentData, allocationsData) {
    if (!recipient) {
      return Bluebird.reject(new errors.InvalidOption('recipient is required'));
    }

    if (!exitShipmentData) {
      return Bluebird.reject(new errors.InvalidOption('exitShipmentData is required'));
    }

    allocationsData = allocationsData || [];

    let exitShipment = new Shipment(exitShipmentData);

    exitShipment.set('type', 'exit');
    exitShipment.setRecipient(recipient);

    exitShipment.setStatus(cebola.constants.SHIPMENT_STATUSES.SCHEDULED, 'NewlyCreated');

    return exitShipment.save()
      .then((exitShipment) => {
        // TODO: study whether allocations should be created sequentially
        // in order to prevent exceeding quantities of allocation.
        // Opinion: No. The system should try to refuse
        // allocating more than there is, but should work
        // even when that kind of error happens
        return Bluebird.all(allocationsData.map((aData) => {
          return cebola.allocation.allocateExit(
            aData.product,
            aData.allocatedQuantity,
            exitShipment
          );
        }));

      })
      .then((allocations) => {
        return exitShipment;
      })
      .catch((err) => {
        // TODO: revert everything

        return Bluebird.reject(err);
      });
  };

  shipmentCtrl.getById = function (shipmentId, options) {

    options = options || {};

    return Shipment.findById(shipmentId).then((shipment) => {
      if (!shipment) {
        return Bluebird.reject(new errors.NotFound('shipment', shipmentId))
      } else {
        return shipment;
      }
    })
  };

  shipmentCtrl.cancel = function (shipment) {
    return ProductRecord.find({
      'shipment._id': util.normalizeObjectId(shipment._id),
    })
    .then((records) => {

      // first cancel all product-records

      return Bluebird.all(records.map((record) => {
        if (record.kind === 'ProductOperation') {

          ProductOperation.prototype.setStatus.call(
            record,
            CONSTANTS.OPERATION_STATUSES.CANCELLED,
            'ShipmentCancelled'
          );

          return record.save();

        } else if (record.kind === 'ProductAllocation') {

          ProductAllocation.prototype.setStatus.call(
            record,
            CONSTANTS.ALLOCATION_STATUSES.CANCELLED,
            'ShipmentCancelled'
          );

          return record.save();
        }
      }));

    })
    .then(() => {
      // then cancel the shipment itself
      // so that if an error happens the user may try again
      
      shipment.setStatus(CONSTANTS.SHIPMENT_STATUSES.CANCELLED, 'ShipmentCancelled');

      return shipment.save();
    });
  };

  shipmentCtrl.finish = function (shipment) {

    // only modify the status of active allocations
    let allocationsQuery = {};
    ProductAllocation.scopeQueryByStatuses(allocationsQuery, [
      CONSTANTS.ALLOCATION_STATUSES.ACTIVE
    ]);

    return cebola.allocation.listByShipment(shipment, allocationsQuery)
      .then((allocations) => {
        // first finish allocations
        
        console.log('ATLLOCATTIONS')

        return Bluebird.all(allocations.map((allocation) => {
          allocation.setStatus(CONSTANTS.ALLOCATION_STATUSES.FINISHED, 'ShipmentFinished');

          return allocation.save();
        }));
      })
      .then((allocations) => {
        
        console.log('allocations SAVED');
        
        // then finish the shipment
        // if any failure happens on allocation finish, the user will be capable of retrying

        shipment.setStatus(CONSTANTS.SHIPMENT_STATUSES.FINISHED, 'ShipmentFinished');
        
        return shipment.save();
      });
  };

  shipmentCtrl.list = function (query, options) {
    query = query || {};

    return Shipment.find(query);
  };
  
  return shipmentCtrl;
};
