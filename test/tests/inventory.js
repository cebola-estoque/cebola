const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('inventoryCtrl', function () {

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

  describe.skip('playground', function () {

    beforeEach(function () {
      /**
       * Start with 1000 units of all products
       */
      return Bluebird.all([
        operationCtrl.registerCorrection(PRODUCT_1_0, 1000),
        operationCtrl.registerCorrection(PRODUCT_1_1, 1000),
        operationCtrl.registerCorrection(PRODUCT_1_2, 700),
        operationCtrl.registerCorrection(PRODUCT_1_2, 300),
      ])
      .then((operations) => {

        var entry1 = aux.mockData.entryShipments[0];
        var entry2 = aux.mockData.entryShipments[1];

        var exit1 = aux.mockData.exitShipments[0];
        var exit2 = aux.mockData.exitShipments[1];

        var allocations = Bluebird.all([
          allocationCtrl.allocateExit(exit1, PRODUCT_1_0, -200),
          allocationCtrl.allocateExit(exit2, PRODUCT_1_0, -300),

          allocationCtrl.allocateEntry(entry1, PRODUCT_1_0, 400),
          allocationCtrl.allocateEntry(entry2, PRODUCT_1_0, 400),
        ]);

        var cancellations = Bluebird.all([
          // cancel one operation
          operationCtrl.cancel(operations[3], 'TestCancel'),
        ]);

        return Bluebird.all([allocations, cancellations]);
      })
      .then((results) => {

        var allocations = results[0];
        var cancellations = results[1];

        return Bluebird.all([
          allocationCtrl.effectivateExit(allocations[0], -150),
          allocationCtrl.effectivateExit(allocations[1], -300),

          allocationCtrl.effectivateEntry(allocations[2], 350),
        ]);

      })
      .catch(aux.logError);
    });

    it('log-result', function () {
      return inventoryCtrl.summary().then((summary) => {
        console.log(summary);
      });
    });

  });

  describe.skip('playground-perf', function () {


    function _insertMockDb() {

      /**
       * Start with 1000 units of all products
       */
      return Bluebird.all([
        operationCtrl.registerCorrection(PRODUCT_1_0, 1000),
        operationCtrl.registerCorrection(PRODUCT_1_1, 1000),
        operationCtrl.registerCorrection(PRODUCT_1_2, 700),
        operationCtrl.registerCorrection(PRODUCT_1_2, 300),
      ])
      .then((operations) => {

        var entry1 = aux.mockData.entryShipments[0];
        var entry2 = aux.mockData.entryShipments[1];

        var exit1 = aux.mockData.exitShipments[0];
        var exit2 = aux.mockData.exitShipments[1];

        var allocations = Bluebird.all([
          allocationCtrl.allocateExit(exit1, PRODUCT_1_0, -200),
          allocationCtrl.allocateExit(exit2, PRODUCT_1_0, -300),

          allocationCtrl.allocateEntry(entry1, PRODUCT_1_0, 400),
          allocationCtrl.allocateEntry(entry2, PRODUCT_1_0, 400),
        ]);

        var cancellations = Bluebird.all([
          // cancel one operation
          operationCtrl.cancel(operations[3], 'TestCancel'),
        ]);

        return Bluebird.all([allocations, cancellations]);
      })
      .then((results) => {

        var allocations = results[0];
        var cancellations = results[1];

        return Bluebird.all([
          allocationCtrl.effectivateExit(allocations[0], -150),
          allocationCtrl.effectivateExit(allocations[1], -300),

          allocationCtrl.effectivateEntry(allocations[2], 350),
        ]);

      });
    }

    beforeEach(function () {

      this.timeout(10 * 60 * 1000);

      return Array(400).fill(0).reduce((lastPromise, item, index) => {
        return lastPromise.then(() => {

          console.log('inserted ' + index);

          return _insertMockDb();
        });

      }, Bluebird.resolve())
      .catch(aux.logError);
    });

    // 200 - 16
    // 300 - 21
    // 400 - 25

    it('log-result', function () {

      var start = Date.now()

      return inventoryCtrl.summary().then((summary) => {
        console.log(summary);

        var end = Date.now();

        console.log(end - start);

      });
    });

  });

  // describe.skip('#productAvailability(productModel, productExpiry, quantityUnit, targetDate)', function () {
  //   var productExpiry = moment().add(2, 'day').toDate();

  //   var product;

  //   beforeEach(function () {
  //     product = {
  //       model: ASSETS.productModel,
  //       expiry: productExpiry,
  //       measureUnit: 'kg'
  //     };

  //     // create some operations so that the product may be considered in stock
  //     return Bluebird.all([
  //       ASSETS.cebola.operation.registerEntry(
  //         ASSETS.entryShipment,
  //         product,
  //         30
  //       ),
  //       ASSETS.cebola.operation.registerEntry(
  //         ASSETS.entryShipment,
  //         product,
  //         50
  //       ),
  //     ])
  //     .then((operations) => {

  //       return Bluebird.all([
  //         // exit 30
  //         allocationCtrl.allocateExit(
  //           ASSETS.exitShipment,
  //           product,
  //           -30
  //         ),

  //         // enter 50
  //         allocationCtrl.allocateEntry(
  //           ASSETS.entryShipment,
  //           product,
  //           50
  //         ),
  //       ]);
  //     })
  //     .catch(aux.logError);

  //   });

  //   it('should check amount in stock and deduce exit allocations', function () {
  //     return inventoryCtrl.productAvailability(
  //       product,
  //       // before the entry allocation
  //       moment().add(1, 'hour').toDate()
  //     )
  //     .then((available) => {

  //       // should count all in stock minus amount allocated for exit
  //       available.should.eql(50);
  //     });
  //   });

  //   it('should take into account entry allocations up to the targetDate', function () {
  //     return inventoryCtrl.productAvailability(
  //       product,
  //       // after the entry allocation
  //       moment().add(5, 'weeks').toDate()
  //     )
  //     .then((available) => {

  //       // should count all in stock minus amount allocated for exit
  //       // plus amount allocated for entry prior to the targetDate
  //       available.should.eql(100);
  //     });

  //   });

  // });

  // describe('#summary(targetDate, query, filter)', function () {
  //   var productExpiry = moment().add(2, 'day').toDate();
  //   var product;

  //   beforeEach(function () {
  //     product = {
  //       model: ASSETS.productModel,
  //       expiry: productExpiry,
  //       measureUnit: 'kg',
  //     };

  //     // create some operations so that the product may be considered in stock
  //     return Bluebird.all([
  //       ASSETS.cebola.operation.registerEntry(
  //         ASSETS.entryShipment,
  //         product,
  //         30
  //       ),
  //       ASSETS.cebola.operation.registerEntry(
  //         ASSETS.entryShipment,
  //         product,
  //         50
  //       ),
  //     ])
  //     .then((operations) => {

  //       return Bluebird.all([
  //         // exit 30
  //         allocationCtrl.allocateExit(
  //           ASSETS.exitShipment,
  //           product,
  //           -30
  //         ),

  //         // enter 50
  //         allocationCtrl.allocateEntry(
  //           ASSETS.entryShipment,
  //           product,
  //           50
  //         ),
  //       ]);
  //     })
  //     .catch(aux.logError);

  //   });

  //   it('should work', function () {
  //     return inventoryCtrl.availabilitySummary(productExpiry)
  //       .then((summary) => {
  //         console.log(summary);
  //       });
  //   });

  //   it('should work 2', function () {
  //     return inventoryCtrl.availabilitySummary(new Date())
  //       .then((summary) => {
  //         console.log(summary);
  //       });
  //   })
  // });


});
