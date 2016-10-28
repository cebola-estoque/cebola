const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('inventoryCtrl - shipment scoped methods', function () {

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
