// third-party dependencies
const mongoose = require('mongoose');
const uuid = require('uuid');

// constants
const Schema = mongoose.Schema;

/**
 * https://schema.org/ProductModel
 * 
 * @type {Schema}
 */
let productModelSchema = new Schema({
  sku: {
    type: String,
    unique: true,
    default: uuid.v4,
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

  let ProductModel = conn.model('ProductModel', productModelSchema);
  
  return ProductModel;
};
