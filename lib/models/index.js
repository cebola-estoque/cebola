module.exports = function (connection, cebola, options) {

  var ProductRecord = require('./product-record')(connection, cebola, options);

  /**
   * Special models that inherits from ProductRecord
   */
  var ProductAllocation = require('./product-record/allocation')(ProductRecord, connection, cebola, options);
  var ProductOperation  = require('./product-record/operation')(ProductRecord, connection, cebola, options);

  var models = {
    ProductRecord: ProductRecord,
    ProductAllocation: ProductAllocation,
    ProductOperation: ProductOperation,
    ProductModel: require('./product-model')(connection, cebola, options),
    Organization: require('./organization')(connection, cebola, options),
    Shipment: require('./shipment')(connection, cebola, options),
  };

  return models;
}