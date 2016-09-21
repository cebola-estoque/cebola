module.exports = function (connection, cebola, options) {
  var models = {
    Allocation: require('./allocation')(connection, cebola, options),
    Operation: require('./operation')(connection, cebola, options),
    ProductModel: require('./product-model')(connection, cebola, options),
    Organization: require('./organization')(connection, cebola, options),
    Shipment: require('./shipment')(connection, cebola, options),
  };

  return models;
}