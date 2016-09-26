// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const ProductModel = cebola.models.ProductModel;

  var productModelCtrl = {};

  productModelCtrl.create = function (data) {
    var productModel = new ProductModel(data);

    return productModel.save();
  };

  productModelCtrl.list = function () {
    return ProductModel.find();
  };

  productModelCtrl.search = function (queryText) {
    return ProductModel.find({
      $text: {
        $search: queryText,
      }
    }, {
      score: { $meta: 'textScore' }
    })
    .sort({ score: { $meta: 'textScore' } })
    .exec();
  };
  
  return productModelCtrl;
};
