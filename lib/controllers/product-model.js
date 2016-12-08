// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const ProductModel = cebola.models.ProductModel;

  var productModelCtrl = {};

  productModelCtrl.create = function (data) {
    var productModel = new ProductModel(data);

    return productModel.save();
  };
  
  /**
   * Retrieves a productModel by its _id attribute
   * 
   * @param {String} productModelId
   */
  productModelCtrl.getById = function (productModelId) {
    if (!productModelId) {
      return Bluebird.reject(new cebola.errors.InvalidOption(
        'productModelId',
        'required'
      ));
    }
    
    return ProductModel.findById(productModelId).then((productModel) => {
      if (!productModel) {
        return Bluebird.reject(
          new cebola.errors.NotFound(
            'productModel',
            productModelId
          )
        )
      }
      
      return productModel;
    });
  }

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
