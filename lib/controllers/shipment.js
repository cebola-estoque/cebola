// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

module.exports = function (cebola, options) {

  const errors = require('../errors');

  const Allocation = cebola.models.Allocation;
  const Shipment = cebola.models.Shipment;

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

    return shipment.save()
      .then((shipment) => {

        // create the allocations
        return Bluebird.all(allocationsData.map((aData) => {
          return cebola.allocation.allocate(shipment, aData);
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

  shipmentCtrl.getById = function (shipmentId, options) {

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
    .then((shipment) => {
      _shipment = shipment;

      var summariesPromise;

      if (options.withSummaries) {
        summariesPromise = Bluebird.all([
          cebola.allocation.shipmentSummary(shipment),
          cebola.operation.shipmentSummary(shipment)
        ]);
      } else {
        summariesPromise = Bluebird.resolve([undefined, undefined]);
      }

      return summariesPromise;
    })
    .then((summaries) => {

      _shipment.summaries = {
        allocations: summaries[0],
        operations: summaries[1],
      };

      return _shipment;
    });
  };

  shipmentCtrl.list = function (query, options) {
    query = query || {};

    return Shipment.find(query);
  };

  shipmentCtrl.listByRecipient = function (recipientId) {

  };

  shipmentCtrl.listBySupplier = function (supplierId) {

  };


  return shipmentCtrl;
};
