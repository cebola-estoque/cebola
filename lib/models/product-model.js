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
    unique: true,
  },

  description: {
    type: String,
    required: true,
  },
});

productModelSchema.index({
  description: 'text',
});


// takes the connection and options and returns the model
module.exports = function (conn, options) {

  if (options.schemas && options.schemas.productModel) {
    options.schemas.productModel(productModelSchema);
  }

  var ProductModel = conn.model('ProductModel', productModelSchema);
  
  return ProductModel;
};
