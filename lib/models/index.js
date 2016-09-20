module.exports = function (connection, options) {
  var models = {
    // Operation: require('./operation')(connection, options),
    ProductModel: require('./product-model')(connection, options),
    Organization: require('./organization')(connection, options),
    Shipment: require('./shipment')(connection, options),
  };

  return models;
}