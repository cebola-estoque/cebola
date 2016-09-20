// third-party dependencies
const mongoose = require('mongoose');

// constants
const Schema = mongoose.Schema;

/**
 * @type {Schema}
 */
var productModelSchema = new Schema({
  sku: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },
});

// takes the connection and options and returns the model
module.exports = function (conn, options) {

  var schemaMixin = options.productModelSchema;

  if (typeof schemaMixin === 'object') {
    productModelSchema.add(schemaMixin);
  } else if (typeof schemaMixin === 'function') {
    schemaMixin(productModelSchema);
  }

  var ProductModel = conn.model('ProductModel', productModelSchema);
  
  return ProductModel;
};
