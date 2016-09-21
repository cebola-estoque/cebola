// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const Allocation = cebola.models.Allocation;

  var allocationCtrl = {};

  allocationCtrl.allocate = function (shipment, allocationData) {

    var allocation = new Allocation(allocationData);

    if (shipment.type === 'exit') {
      // exit allocations MUST be verified against the quantity available
      
    } else {
      
    }

    allocation.setShipment(shipment);


    return allocation.save();

  };

  allocationCtrl.listByShipment = function (shipment) {

  };

  return allocationCtrl;
};
