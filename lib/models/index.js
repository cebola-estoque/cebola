module.exports = function (connection, options) {
  var models = {
    Operation: require('./operation')(connection, options),
    ProductModel: require('./models/product-model')(connection, options),
    Organization: require('./models/organization')(connection, options),
  };

  return models;
}