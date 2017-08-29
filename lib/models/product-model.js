// third-party dependencies
const mongoose = require('mongoose');

// constants
const Schema = mongoose.Schema;

/**
 * https://schema.org/ProductModel
 * 
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
  
  /**
   * Dimensions in centimeters
   * @type {Object}
   */
  width: {
    type: Number,
  },
  height: {
    type: Number,
  },
  depth: {
    type: Number,
  },

  /**
   * Weights in grams
   * weight is used for grossWeight
   * and netWeight is for netWeight
   * @type {Object}
   */
  weight: {
    type: Number,
  },
  netWeight: {
    type: Number,
  },
});

productModelSchema.index({
  description: 'text',
});

// takes the connection and options and returns the model
module.exports = function (conn, app, options) {

  if (options.schemas && options.schemas.productModel) {
    options.schemas.productModel(productModelSchema);
  }

  var ProductModel = conn.model('ProductModel', productModelSchema);
  
  return ProductModel;
};
