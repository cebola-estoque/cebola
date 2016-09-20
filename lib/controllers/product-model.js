// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const ProductModel = cebola.models.ProductModel;

  var productModelCtrl = {};

  productModelCtrl.create = function (data) {
    var productModel = new ProductModel(data);

    return productModel.save();
  };
  
  return productModelCtrl;
};
