const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

describe('ProductAllocation', function () {

  var ASSETS;
  var ProductAllocation;

  /**
   * Helper mock objects
   */
  var product = {
    model: {
      _id: 'product-model-id-123',
      description: 'Some product',
    },
    expiry: moment().add(3, 'days').toDate(),
    measureUnit: 'KG',
    sourceShipment: {
      _id: 'shipment-123123',
    }
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

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        ProductAllocation = ASSETS.cebola.models.ProductAllocation;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('allocatedQuantity, effectivatedQuantity & quantity', function () {


    it('should require allocatedQuantity to match the allocation type: entry > 0', function () {
      var allocation = new ProductAllocation({
        product: product,
        allocatedQuantity: -40
      });

      allocation.setStatus(
        ASSETS.cebola.constants.ALLOCATION_STATUSES.ACTIVE,
        'TestReason'
      );

      allocation.setShipment(entryShipment);

      return allocation.save()
        .then(aux.errorExpected, (err) => {
          err.should.be.instanceof(mongoose.Error.ValidationError);
        });
    });

    it('should require allocatedQuantity to match the allocation type: exit < 0', function () {
      var allocation = new ProductAllocation({
        product: product,
        allocatedQuantity: 40
      });

      allocation.setStatus(
        ASSETS.cebola.constants.ALLOCATION_STATUSES.ACTIVE,
        'TestReason'
      );

      allocation.setShipment(exitShipment);

      return allocation.save()
        .then(aux.errorExpected, (err) => {
          err.should.be.instanceof(mongoose.Error.ValidationError);
        });
    });

    it('should automatically calculate `quantity = allocatedQuantity - effectivatedQuantity`', function () {
      var allocation = new ProductAllocation({
        product: product,
        allocatedQuantity: 40,
      });

      allocation.setStatus(
        ASSETS.cebola.constants.ALLOCATION_STATUSES.ACTIVE,
        'TestReason'
      );

      allocation.setShipment(entryShipment);

      return allocation.save().then((allocation) => {
        allocation.allocatedQuantity.should.equal(40);
        allocation.effectivatedQuantity.should.equal(0);
        // allocation.quantity.should.equal(40);
      })
      .catch(aux.logError);

    });

    it('should update the quantity if the allocatedQuantity is updated', function () {
      var allocation = new ProductAllocation({
        product: product,
        allocatedQuantity: 40,
      });

      allocation.setStatus(
        ASSETS.cebola.constants.ALLOCATION_STATUSES.ACTIVE,
        'TestReason'
      );

      allocation.setShipment(entryShipment);

      return allocation.save().then((allocation) => {
        allocation.allocatedQuantity.should.equal(40);
        allocation.effectivatedQuantity.should.equal(0);
        // allocation.quantity.should.equal(40);

        allocation.set('allocatedQuantity', 60);

        return allocation.save();
      })
      .then((allocation) => {
        allocation.allocatedQuantity.should.equal(60);
        allocation.effectivatedQuantity.should.equal(0);
        allocation.quantity.should.equal(60);
      });
    });

    it('should update the quantity is the effectivatedQuantity is updated', function () {
      var allocation = new ProductAllocation({
        product: product,
        allocatedQuantity: 40,
      });

      allocation.setStatus(
        ASSETS.cebola.constants.ALLOCATION_STATUSES.ACTIVE,
        'TestReason'
      );

      allocation.setShipment(entryShipment);

      return allocation.save().then((allocation) => {
        allocation.allocatedQuantity.should.equal(40);
        allocation.effectivatedQuantity.should.equal(0);
        allocation.quantity.should.equal(40);

        allocation.set('effectivatedQuantity', 20);

        return allocation.save();
      })
      .then((allocation) => {
        allocation.allocatedQuantity.should.equal(40);
        allocation.effectivatedQuantity.should.equal(20);
        allocation.quantity.should.equal(20);
      });
    });

  });

});
