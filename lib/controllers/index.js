module.exports = function (cebola, options) {
  return {
    // inventory: require('./inventory')(cebola, options),
    allocation: require('./allocation')(cebola, options),
    operation: require('./operation')(cebola, options),
    organization: require('./organization')(cebola, options),
    productModel: require('./product-model')(cebola, options),
    shipment: require('./shipment')(cebola, options),
  };
};
