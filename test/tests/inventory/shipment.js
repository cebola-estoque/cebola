const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

describe('inventoryCtrl - shipment scoped methods', function () {

  var ASSETS;
  var inventoryCtrl;
  var allocationCtrl;
  var operationCtrl;

  /**
   * Mock data
   */
  
  /**
   * - is of product-1 model
   * - expires only after all exit shipments that exist.
   * - uses 'kg' as the measure unit
   * @type {Object}
   */
  var PRODUCT_1_0 = {
    model: aux.mockData.productModels[0],
    expiry: moment().add(7, 'days').toDate(),
    measureUnit: 'kg',
  };

  /**
   * - is of product-1 model
   * - expires after the first shipments (1 day) and before the second (2 days)
   * - uses 'kg' as the measure unit
   * @type {Object}
   */
  var PRODUCT_1_1 = {
    model: aux.mockData.productModels[0],
    expiry: moment().add(2, 'days').toDate(),
    measureUnit: 'kg',
  };

  /**
   * - is of product-1 model
   * - expires before both shipments. MUST NOT BE SHIPPABLE
   * - uses 'kg' as the measure unit
   * @type {Object}
   */
  var PRODUCT_1_2 = {
    model: aux.mockData.productModels[0],
    expiry: moment().add(12, 'hour').toDate(),
    measureUnit: 'kg',
  };

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

  describe('#shipmentSummary(shipment) - entry shipments', function () {

    beforeEach(function () {
      /**
       * Start with 1000 units of all products
       */
      return Bluebird.all([
        operationCtrl.registerEntry(PRODUCT_1_0, 1000),
        operationCtrl.registerEntry(PRODUCT_1_1, 1000),
        operationCtrl.registerEntry(PRODUCT_1_2, 700),
        operationCtrl.registerEntry(PRODUCT_1_2, 300),
      ])
      .then((operations) => {

        var entry1 = aux.mockData.entryShipments[0];
        var entry2 = aux.mockData.entryShipments[1];

        return Bluebird.all([
          allocationCtrl.allocateEntry(entry1, PRODUCT_1_0, 400),
          allocationCtrl.allocateEntry(entry1, PRODUCT_1_2, 500),
          allocationCtrl.allocateEntry(entry2, PRODUCT_1_0, 400),
        ]);
      })
      .then((allocations) => {

        return Bluebird.all([
          allocationCtrl.effectivateEntry(allocations[2], 350),
        ]);

      })
      .catch(aux.logError);
    });

    it('should list all allocated quantities for a shipment', function () {
      return inventoryCtrl.shipmentSummary(aux.mockData.entryShipments[1])
        .then((summary) => {

          var PRODUCT_1_0_summary = summary.find(function (summ) {
            return aux.areSameProduct(summ.product, PRODUCT_1_0);
          });

          PRODUCT_1_0_summary.exited.should.eql(0);
          PRODUCT_1_0_summary.entered.should.eql(350);
          PRODUCT_1_0_summary.allocatedForExit.should.eql(0);
          PRODUCT_1_0_summary.allocatedForEntry.should.eql(50);

          PRODUCT_1_0_summary.quantity.should.eql(400);
          PRODUCT_1_0_summary.inStock.should.eql(350);

          summary.length.should.eql(1);
        });
    });
  });

  describe('#shipmentSummary(shipment) - exit shipments', function () {
    beforeEach(function () {
      /**
       * Start with 1000 units of all products
       */
      return Bluebird.all([
        operationCtrl.registerEntry(PRODUCT_1_0, 1000),
        operationCtrl.registerEntry(PRODUCT_1_1, 1000),
        operationCtrl.registerEntry(PRODUCT_1_2, 700),
        operationCtrl.registerEntry(PRODUCT_1_2, 300),
      ])
      .then((operations) => {

        var exit1 = aux.mockData.exitShipments[0];
        var exit2 = aux.mockData.exitShipments[1];

        return Bluebird.all([
          allocationCtrl.allocateExit(exit1, PRODUCT_1_0, -400),
          allocationCtrl.allocateExit(exit1, PRODUCT_1_2, -500),
          allocationCtrl.allocateExit(exit2, PRODUCT_1_0, -400),
        ]);
      })
      .then((allocations) => {

        return Bluebird.all([
          allocationCtrl.effectivateExit(allocations[0], -100),
          allocationCtrl.effectivateExit(allocations[1], -150),
        ]);

      })
      .catch(aux.logError);
    });

    it('should list allocated quantities for exit shipment', function () {
      return inventoryCtrl.shipmentSummary(aux.mockData.exitShipments[0])
        .then((summary) => {

          var PRODUCT_1_0_summary = summary.find(function (summ) {
            return aux.areSameProduct(summ.product, PRODUCT_1_0);
          });

          PRODUCT_1_0_summary.entered.should.eql(0);
          PRODUCT_1_0_summary.exited.should.eql(-100);
          PRODUCT_1_0_summary.allocatedForExit.should.eql(-300);
          PRODUCT_1_0_summary.allocatedForEntry.should.eql(0);

          var PRODUCT_1_2_summary = summary.find(function (summ) {
            return aux.areSameProduct(summ.product, PRODUCT_1_2);
          });

          PRODUCT_1_2_summary.entered.should.eql(0);
          PRODUCT_1_2_summary.exited.should.eql(-150);
          PRODUCT_1_2_summary.allocatedForExit.should.eql(-350);
          PRODUCT_1_2_summary.allocatedForEntry.should.eql(0);
        });
    });
  });
});
