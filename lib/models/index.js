module.exports = function (connection, cebola, options) {

  let ProductRecord = require('./product-record/record')(connection, cebola, options);

  /**
   * Special models that inherit from ProductRecord
   */
  let ProductAllocation = require('./product-record/allocation')(ProductRecord, connection, cebola, options);
  let ProductOperation  = require('./product-record/operation')(ProductRecord, connection, cebola, options);

  let models = {
    ProductRecord: ProductRecord,
    ProductAllocation: ProductAllocation,
    ProductOperation: ProductOperation,
    ProductModel: require('./product-model')(connection, cebola, options),
    Organization: require('./organization')(connection, cebola, options),
    Shipment: require('./shipment')(connection, cebola, options),
  };

  return models;
}