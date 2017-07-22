// third-party
const Bluebird = require('bluebird');
const moment   = require('moment');

const errors = require('../errors');
const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const errors = require('../errors');

  const ProductRecord     = cebola.models.ProductRecord;
  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;
  const Shipment          = cebola.models.Shipment;

  var shipmentCtrl = {};

  /**
   * Entry scheduling has a difference from exit scheduling
   * as entry scheduling does not demand any kind of verification
   * as (for now) there is no physical limitation to how
   * many units it is possible to store.
   * 
   * @param  {[type]} supplier        [description]
   * @param  {[type]} shipmentData    [description]
   * @param  {[type]} allocationsData [description]
   * @return {[type]}                 [description]
   */
  shipmentCtrl.scheduleEntry = function (supplier, shipmentData, allocationsData) {

    if (!supplier) {
      return Bluebird.reject(new errors.InvalidOption('supplier is required'));
    }

    if (!shipmentData) {
      return Bluebird.reject(new errors.InvalidOption('shipmentData is required'));
    }

    allocationsData = allocationsData || [];

    var shipment = new Shipment(shipmentData);

    shipment.set('type', 'entry');
    shipment.setSupplier(supplier);

    shipment.setStatus(cebola.constants.SHIPMENT_STATUSES.SCHEDULED, 'NewlyCreated');

    return shipment.save()
      .then((shipment) => {

        // create the allocations
        return Bluebird.all(allocationsData.map((aData) => {
          return cebola.allocation.allocateEntry(
            shipment,
            aData.product,
            aData.allocatedQuantity
          );
        }));
      })
      .then((allocations) => {
        return shipment;
      })
      .catch((err) => {
        // revert everything
        console.log(err);

        throw err;
      });

  };

  /**
   * Exit scheduling MUST take into account the quantity available
   * prior to saving the requested quantity.
   * 
   * @param  {[type]} recipient     [description]
   * @param  {[type]} shipmentData            [description]
   * @param  {[type]} allocationsData [description]
   * @return {[type]}                 [description]
   */
  shipmentCtrl.scheduleExit = function (recipient, shipmentData, allocationsData) {
    if (!recipient) {
      return Bluebird.reject(new errors.InvalidOption('recipient is required'));
    }

    if (!shipmentData) {
      return Bluebird.reject(new errors.InvalidOption('shipmentData is required'));
    }

    allocationsData = allocationsData || [];

    var shipment = new Shipment(shipmentData);

    shipment.set('type', 'exit');
    shipment.setRecipient(recipient);

    shipment.setStatus(cebola.constants.SHIPMENT_STATUSES.SCHEDULED, 'NewlyCreated');

    return shipment.save()
      .then((shipment) => {
        // TODO: study whether allocations should be created sequentially
        // in order to prevent exceeding quantities of allocation.
        // Opinion: No. The system should try to refuse
        // allocating more than there is, but should work
        // even when that kind of error happens
        return Bluebird.all(allocationsData.map((aData) => {
          return cebola.allocation.allocateExit(
            shipment,
            aData.product,
            aData.allocatedQuantity
          );
        }));

      })
      .then((allocations) => {
        return shipment;
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
      'shipment._id': shipment._id.toString(),
    })
    .then((records) => {

      // first cancel all product-records

      return Bluebird.all(records.map((record) => {
        if (record.kind === 'ProductOperation') {

          ProductRecord.prototype.setStatus.call(
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

  shipmentCtrl.finish = function (shipment, annotations) {

    // only modify the status of active allocations
    var allocationsQuery = {};
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
        
        console.log('status set');

        shipment.set('annotations', annotations);

        console.log('annotations added');

        return shipment.save();
      });
  };

  shipmentCtrl.list = function (query, options) {
    query = query || {};

    return Shipment.find(query);
  };
  
  return shipmentCtrl;
};
