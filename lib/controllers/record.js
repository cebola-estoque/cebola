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

      var loadPromise = Bluebird.resolve(records);

      if (options.loadFullProductSourceShipment) {
        loadPromise = loadPromise.then((records) => {
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
        loadPromise = loadPromise.then((records) => {
          return util.populateReference(
            records,
            'product.model',
            cebola.models.ProductModel
          );
        })
      }

      // TODO: study whether is ideal
      // if (options.loadProductOperations) {

      //   // convert records to normal json object
      //   records = records.map(record => {
      //     return typeof record.toJSON === 'function' ? record.toJSON() : record;
      //   });

      //   loadPromise = loadPromise.then((records) => {
      //     return Bluebird.all(records.map((record) => {
      //       return cebola.operation.listByProduct(record.product);
      //     }))
      //     .then((recordsProductOps) => {
      //       recordsProductOps.forEach((ops, index) => {
      //         records[index].product.operations = ops;
      //       });
      //     })
      //     .then(() => {
      //       return records;
      //     })
      //   });
      // }

      return loadPromise;
    });
  };

  return recordCtrl;
};
