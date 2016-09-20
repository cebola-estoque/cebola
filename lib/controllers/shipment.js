// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

module.exports = function (cebola, options) {

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
        var allocations = allocationsData.map((aData) => {
          var allocation = new Allocation(aData);

          allocation.setShipment(shipment);

          return allocation;
        });

        return Bluebird.all(allocations.map((allocation) => {
          return allocation.save();
        }));

      })
      .then(() => {

      })
      .catch((err) => {
        // revert everything
      });

  };

  /**
   * Exit scheduling MUST take into account the quantity available
   * prior to saving the requested quantity.
   * 
   * @param  {[type]} destination     [description]
   * @param  {[type]} data            [description]
   * @param  {[type]} allocationsData [description]
   * @return {[type]}                 [description]
   */
  shipmentCtrl.scheduleExit = function (destination, data, allocationsData) {

  };


  return shipmentCtrl;
};
