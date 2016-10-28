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

        // create required database entries:
        // - supplier
        // - productModel
        return Bluebird.all([
          cebola.organization.create({
            name: 'Test Organization',
            roles: ['supplier'],
            document: {
              type: 'CNPJ',
              value: '87.023.556/0001-81',
            }
          }),
          cebola.organization.create({
            name: 'Test Organization 2',
            roles: ['receiver'],
            document: {
              type: 'CNPJ',
              value: '22.505.238/0001-01',
            }
          }),
          cebola.productModel.create({
            description: 'Test Product',
            sku: '12345678',
          })
        ]);
      })
      .then((results) => {
        ASSETS.supplier = results[0];
        ASSETS.receiver = results[1];
        ASSETS.productModel = results[2];

        return Bluebird.all([
          ASSETS.cebola.shipment.scheduleEntry(
            ASSETS.supplier,
            {
              scheduledFor: moment().add(1, 'day'),
            }
          ),
          ASSETS.cebola.shipment.scheduleExit(
            ASSETS.receiver,
            {
              scheduledFor: moment().add(1, 'day'),
            }
          ),
        ]);
      })
      .then((shipments) => {
        ASSETS.entryShipment = shipments[0];
        ASSETS.exitShipment = shipments[1];
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe.skip('#productAvailability(productModel, productExpiry, quantityUnit, targetDate)', function () {
    var productExpiry = moment().add(2, 'day').toDate();

    var product;

    beforeEach(function () {
      product = {
        model: ASSETS.productModel,
        expiry: productExpiry,
        measureUnit: 'kg'
      };

      // create some operations so that the product may be considered in stock
      return Bluebird.all([
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          product,
          30
        ),
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          product,
          50
        ),
      ])
      .then((operations) => {

        return Bluebird.all([
          // exit 30
          allocationCtrl.allocateExit(
            ASSETS.exitShipment,
            product,
            -30
          ),

          // enter 50
          allocationCtrl.allocateEntry(
            ASSETS.entryShipment,
            product,
            50
          ),
        ]);
      })
      .catch(aux.logError);

    });

    it('should check amount in stock and deduce exit allocations', function () {
      return inventoryCtrl.productAvailability(
        product,
        // before the entry allocation
        moment().add(1, 'hour').toDate()
      )
      .then((available) => {

        // should count all in stock minus amount allocated for exit
        available.should.eql(50);
      });
    });

    it('should take into account entry allocations up to the targetDate', function () {
      return inventoryCtrl.productAvailability(
        product,
        // after the entry allocation
        moment().add(5, 'weeks').toDate()
      )
      .then((available) => {

        // should count all in stock minus amount allocated for exit
        // plus amount allocated for entry prior to the targetDate
        available.should.eql(100);
      });

    });

  });

  describe('#summary(targetDate, query, filter)', function () {
    var productExpiry = moment().add(2, 'day').toDate();
    var product;

    beforeEach(function () {
      product = {
        model: ASSETS.productModel,
        expiry: productExpiry,
        measureUnit: 'kg',
      };

      // create some operations so that the product may be considered in stock
      return Bluebird.all([
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          product,
          30
        ),
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          product,
          50
        ),
      ])
      .then((operations) => {

        return Bluebird.all([
          // exit 30
          allocationCtrl.allocateExit(
            ASSETS.exitShipment,
            product,
            -30
          ),

          // enter 50
          allocationCtrl.allocateEntry(
            ASSETS.entryShipment,
            product,
            50
          ),
        ]);
      })
      .catch(aux.logError);

    });

    it('should work', function () {
      return inventoryCtrl.availabilitySummary(productExpiry)
        .then((summary) => {
          console.log(summary);
        });
    });

    it('should work 2', function () {
      return inventoryCtrl.availabilitySummary(new Date())
        .then((summary) => {
          console.log(summary);
        });
    })
  });


});
