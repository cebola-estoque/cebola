// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const Allocation = cebola.models.Allocation;

  var allocationCtrl = {};

  allocationCtrl.registerEntry = function (shipment, allocationData) {

    var allocation = new Allocation(allocationData);


    return allocation.save();

  };

  allocationCtrl.registerExit = function (shipment, allocationData) {

  };

  return allocationCtrl;
};
