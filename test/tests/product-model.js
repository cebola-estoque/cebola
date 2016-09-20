const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('productModelCtrl', function () {

  var ASSETS;
  var productModelCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        productModelCtrl = ASSETS.cebola.productModel;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('create', function () {
    it('should create a new productModel entry in the database', function () {

      return productModelCtrl.create({
        description: 'Test Product',
        sku: '12345678',
      })
      .then((productModel) => {
        mongoose.Types.ObjectId.isValid(productModel._id).should.equal(true);
      })
      .catch((err) => {
        console.log(err);

        throw err;
      });

    });
  });

});
