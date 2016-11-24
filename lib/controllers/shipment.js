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
            aData.quantity
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
   * @param  {[type]} destination     [description]
   * @param  {[type]} shipmentData            [description]
   * @param  {[type]} allocationsData [description]
   * @return {[type]}                 [description]
   */
  shipmentCtrl.scheduleExit = function (destination, shipmentData, allocationsData) {
    if (!destination) {
      return Bluebird.reject(new errors.InvalidOption('destination is required'));
    }

    if (!shipmentData) {
      return Bluebird.reject(new errors.InvalidOption('shipmentData is required'));
    }

    allocationsData = allocationsData || [];

    var shipment = new Shipment(shipmentData);

    shipment.set('type', 'exit');
    shipment.setSupplier(destination);

    shipment.setStatus(cebola.constants.SHIPMENT_STATUSES.SCHEDULED, 'NewlyCreated');

    return shipment.save()
      .then((shipment) => {

        // create the allocations
        var allocations = allocationsData.map((aData) => {
          var allocation = new Allocation(aData);

          allocation.setShipment(shipment);

          return allocation;
        });

        return Bluebird.all(allocations.map((allocation) => {
          return allocation.save();
        }));

      })
      .then((allocations) => {
        return shipment;
      })
      .catch((err) => {
        // revert everything
      });
  };

  shipmentCtrl.getById = function (shipmentId) {

    options = options || {};

    var _shipment;

    return Shipment.findOne({
      _id: shipmentId,
    })
    .then((shipment) => {
      if (!shipment) {
        return Bluebird.reject(new errors.NotFound(shipmentId))
      } else {
        return shipment;
      }
    })
  };

  // shipmentCtrl.getSummary = function (shipment) {

  //   return Bluebird.all([
  //     cebola.allocation.listByShipment(shipment),
  //     cebola.operation.listByShipment(shipment),
  //   ])
  //   .then((results) => {

  //     console.log(results);

  //     var summary = Shipment.mergeAllocationsAndOperations(results[0], results[1]);

  //     console.log(summary);

  //     return summary;
  //   });
  // };

  shipmentCtrl.cancel = function (shipment) {
    return ProductRecord.find({
      'shipment._id': shipment._id.toString(),
    })
    .then((records) => {

      // first cancel all product-records

      return Bluebird.all(records.map((record) => {
        if (record.kind === 'ProductOperation') {

          ProductRecord.methods.setStatus.call(
            record,
            CONSTANTS.OPERATION_STATUSES.CANCELLED,
            'ShipmentCancelled'
          );

          return record.save();

        } else if (record.kind === 'ProductAllocation') {

          ProductAllocation.methods.setStatus.call(
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
    return cebola.allocation.listByShipment(shipment)
      .then((allocations) => {
        // first finish allocations

        return Bluebird.all(allocations.map((allocation) => {
          allocation.setStatus(CONSTANTS.ALLOCATION_STATUSES.FINISHED, 'ShipmentFinished');

          return allocation.save();
        }));
      })
      .then((allocations) => {
        // then finish the shipment
        // if any failure happens on allocation finish, the user will be capable of retrying

        shipment.setStatus(CONSTANTS.SHIPMENT_STATUSES.FINISHED, 'ShipmentFinished');

        return shipment.save();
      });
  };

  // shipmentCtrl.getSummary = function (shipment) {

  //   return Bluebird.all([
  //     cebola.allocation.shipmentSummary(shipment),
  //     cebola.operation.shipmentSummary(shipment)
  //   ])
  //   .then((summaries) => {

  //     var allocations      = summaries[0];
  //     var operations       = summaries[1];
  //     var orphanOperations = [];

  //     // for each operation, find the equivalent
  //     // allocation and attach it to the allocation
  //     // 
  //     // if the operation does not correspond to any allocation
  //     // add it to a list of 'orphan' operations
  //     operations.forEach((op) => {

  //       var alloc = allocations.find((alloc) => {
  //         var isSameProductModel  = alloc.productModel._id === op.productModel._id;
  //         var isSameProductExpiry = moment(alloc.productExpiry).isSame(op.productExpiry);
  //         var isSameQuantityUnit  = alloc.quantity.unit === op.quantity.unit;
          
  //         return (isSameProductModel && isSameProductExpiry && isSameQuantityUnit);
  //       });

  //       if (alloc) {
  //         alloc.operations = alloc.operations || [];
  //         alloc.operations.push(op);
  //       } else {
  //         orphanOperations.push(op);
  //       }

  //     });

  //     return {
  //       allocations: allocations,
  //       operations: allocations,
  //       orphanOperations: orphanOperations,
  //     };
  //   });
  // };

  shipmentCtrl.list = function (query, options) {
    query = query || {};

    return Shipment.find(query);
  };

  return shipmentCtrl;
};
