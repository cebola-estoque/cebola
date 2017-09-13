// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');
const util   = require('../util');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductRecord = cebola.models.ProductRecord;

  let recordCtrl = {};

  /**
   * Lists ProductRecord for the given shipment
   * @param  {Shipment} shipment
   * @param  {Object} options
   * @return {Bluebird -> Array[ProductRecord]}
   */
  recordCtrl.listByShipment = function (shipment, options) {
    options = options || {};

    if (!shipment) {
      return Bluebird.reject(new errors.InvalidOption('shipment', 'required'));
    }

    let query = { 'shipment._id': shipment._id };

    return ProductRecord.find(query).then((records) => {
      if (options.loadFullProductSourceShipment) {
        return util.populateReference(
          records,
          'product.sourceShipment',
          cebola.models.Shipment
        );
      } else {
        return records;
      }
    });
  };

  return recordCtrl;
};
