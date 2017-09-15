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

      var populatePromise = Bluebird.resolve(records);

      if (options.loadFullProductSourceShipment) {
        populatePromise = populatePromise.then((records) => {
          return util.populateReference(
            records,
            'product.sourceShipment',
            cebola.models.Shipment
          );
        });
      }

      /**
       * TODO make population parallell
       */
      if (options.loadFullProductModel) {
        populatePromise = populatePromise.then((records) => {
          return util.populateReference(
            records,
            'product.model',
            cebola.models.ProductModel
          );
        })
      }

      return populatePromise;
    });
  };

  return recordCtrl;
};
