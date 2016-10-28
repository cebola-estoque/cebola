const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

describe('ProductOperation', function () {

  var ASSETS;
  var ProductOperation;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        ProductOperation = ASSETS.cebola.models.ProductOperation;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('quantity', function () {

    var product = {
      model: {
        _id: 'product-model-id',
        description: 'Some product',
      },
      expiry: moment().add(3, 'days').toDate(),
      measureUnit: 'kg',
    };

    var entryShipment = {
      _id: 'some-entry-shipment-id',
      type: 'entry',
      scheduledFor: moment(product.expiry).subtract(1, 'day').toDate(),
    };

    var exitShipment = {
      _id: 'some-exit-shipment-id',
      type: 'exit',
      scheduledFor: moment(product.expiry).subtract(1, 'day').toDate(),
    };

    it('should require the operation\'s quantity to match the operation type: exit < 0', function () {
      var operation = new ProductOperation({
        quantity: 10
      });

      operation.setStatus(
        ASSETS.cebola.constants.OPERATION_STATUSES.ACTIVE,
        'TestReason'
      );

      operation.set('type', 'exit');

      return operation.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });

    it('should require the operation\'s quantity to match the operation type: entry > 0', function () {
      var operation = new ProductOperation({
        quantity: -10
      });

      operation.setStatus(
        ASSETS.cebola.constants.OPERATION_STATUSES.ACTIVE,
        'TestReason'
      );

      operation.set('type', 'entry');

      return operation.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });

  });

});
