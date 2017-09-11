// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductRecord = cebola.models.ProductRecord;

  let recordCtrl = {};

  /**
   * Lists ProductRecord for the given shipment
   * @param  {Shipment} shipment
   * @return {Bluebird -> Array[ProductRecord]}
   */
  recordCtrl.listByShipment = function (shipment) {
    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    let query = { 'shipment._id': shipment._id.toString() };

    return ProductRecord.find(query);
  };

  return recordCtrl;
};
