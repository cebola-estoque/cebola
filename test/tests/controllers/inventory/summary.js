const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');
const clone    = require('clone');

const aux = require('../../../aux');

const makeCebola = require('../../../../lib');

describe('inventoryCtrl.summary(query, filter, sort, options)', function () {

  var ASSETS;
  var inventoryCtrl;
  var allocationCtrl;
  var operationCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        inventoryCtrl  = ASSETS.cebola.inventory;
        allocationCtrl = ASSETS.cebola.allocation;
        operationCtrl  = ASSETS.cebola.operation;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  const SAMPLE_PRODUCT_0_DATA = {
    model: aux.mockData.productModels[0],
    expiry: moment().add(7, 'days').toDate(),
    measureUnit: 'kg',
  };

  const SAMPLE_PRODUCT_1_DATA = {
    model: aux.mockData.productModels[1],
    expiry: moment().add(7, 'days').toDate(),
    measureUnit: 'kg',
  };

  const SAMPLE_ENTRY_SHIPMENT_DATA = aux.mockData.shipments.find(s => {
    return s.type === 'entry';
  });

  const SAMPLE_EXIT_SHIPMENT_DATA = aux.mockData.shipments.find(s => {
    return s.type === 'exit';
  });

  describe('operations: exited, entered & inStock', function () {
    it('should return a summary of all operations', function () {

      var product0Data      = clone(SAMPLE_PRODUCT_0_DATA);
      var product1Data      = clone(SAMPLE_PRODUCT_1_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData  = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      product0Data.sourceShipment = entryShipmentData;
      product1Data.sourceShipment = entryShipmentData;

      let product0Query = {
        'product.model._id': product0Data.model._id,
        'product.expiry': ASSETS.cebola.models.ProductRecord.normalizeExpiryDate(product0Data.expiry),
        'product.measureUnit': ASSETS.cebola.models.ProductRecord.normalizeMeasureUnit(product0Data.measureUnit),
        'product.sourceShipment._id': product0Data.sourceShipment._id,
      };

      return Bluebird.all([
        operationCtrl.registerEntry(product0Data, 100),
        operationCtrl.registerEntry(product0Data, 150),
        operationCtrl.registerEntry(product0Data, 200),

        operationCtrl.registerEntry(product1Data, 300),
      ])
      .then((entryOperations) => {
        return inventoryCtrl.summary(product0Query);
      })
      .then((summary) => {
        summary.length.should.eql(1);

        summary[0].exited.should.eql(0);
        summary[0].entered.should.eql(450);
        summary[0].inStock.should.eql(450);

        return Bluebird.all([
          operationCtrl.registerExit(product0Data, -50),
          operationCtrl.registerExit(product0Data, -100),
        ]);
      })
      .then(() => {
        return inventoryCtrl.summary(product0Query);
      })
      .then((summary) => {
        summary.length.should.eql(1);

        summary[0].exited.should.eql(-150);
        summary[0].entered.should.eql(450);
        summary[0].inStock.should.eql(300);
      });

    });
  });

});
