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
    unitPrice: {
      value: 1050,
      currency: 'BRL',
    }
  };

  const SAMPLE_PRODUCT_1_DATA = {
    model: aux.mockData.productModels[1],
    expiry: moment().add(7, 'days').toDate(),
    measureUnit: 'kg',
    unitPrice: {
      value: 2550,
      currency: 'BRL',
    }
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
        'product.model._id': makeCebola.util.normalizeObjectId(product0Data.model._id),
        'product.expiry': ASSETS.cebola.models.ProductRecord.normalizeExpiryDate(product0Data.expiry),
        'product.measureUnit': ASSETS.cebola.models.ProductRecord.normalizeMeasureUnit(product0Data.measureUnit),
        'product.sourceShipment._id': makeCebola.util.normalizeObjectId(product0Data.sourceShipment._id),
      };

      var entryShipment = new ASSETS.cebola.models.Shipment(entryShipmentData);
      entryShipment.setStatus('scheduled', 'TestReason');

      var productModel0 = new ASSETS.cebola.models.ProductModel(product0Data.model);
      var productModel1 = new ASSETS.cebola.models.ProductModel(product1Data.model);

      return Bluebird.all([
        entryShipment.save(),
        productModel0.save(),
        productModel1.save(),
      ])
      .then(() => {
        return Bluebird.all([
          operationCtrl.registerEntry(product0Data, 100),
          operationCtrl.registerEntry(product0Data, 150),
          operationCtrl.registerEntry(product0Data, 200),

          operationCtrl.registerEntry(product1Data, 300),
        ])
      })
      .then((entryOperations) => {
        return inventoryCtrl.summary(product0Query);
      })
      .then((summary) => {
        
        summary.length.should.eql(1);

        summary[0].exited.should.eql(0);
        summary[0].entered.should.eql(450);
        summary[0].inStock.should.eql(450);

        // should correspond to the product0's summary, as the query is for the product0
        summary[0].product.model._id.toString().should.eql(product0Data.model._id);
        summary[0].product.expiry.should.eql(makeCebola.util.normalizeExpiryDate(product0Data.expiry));
        summary[0].product.measureUnit.should.eql(makeCebola.util.normalizeMeasureUnit(product0Data.measureUnit));
        summary[0].product.sourceShipment._id.toString().should.eql(product0Data.sourceShipment._id.toString());
        summary[0].product.unitPrice.value.should.eql(product0Data.unitPrice.value);
        summary[0].product.unitPrice.currency.should.eql(product0Data.unitPrice.currency);

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
      })
      .catch(aux.logError);

    });
  });

});
