const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('allocationCtrl', function () {

  var ASSETS;
  var allocationCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

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

  describe('#allocateEntry(shipment, product, quantity)', function () {

    it('should create an allocation associated to the given shipment', function () {

      var product = {
        model: ASSETS.productModel,
        expiry: moment().add(2, 'day').toDate(),
        measureUnit: 'kg',
      };


      return allocationCtrl.allocateEntry(
        ASSETS.entryShipment,
        product,
        20
      )
      .then((allocation) => {

        allocation.shipment._id.should.eql(ASSETS.entryShipment._id.toString());
        allocation.product.model._id.should.eql(ASSETS.productModel._id.toString());

        // check that the allocation modifies the allocation summary
        return ASSETS.cebola.inventory.productSummary(product);
      })
      .then((summary) => {

        console.log(summary);

        summary.inStock.should.eql(0);
        summary.allocatedForExit.should.eql(0);
        summary.allocatedForEntry.should.eql(20);
        summary.quantity.should.eql(20);

      })
      .catch(aux.logError);
    });
  });

  describe('#allocateExit(shipment, product, quantity)', function () {
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
          product,
          30,
          {
            shipment: ASSETS.entryShipment,
          }
        ),
        ASSETS.cebola.operation.registerEntry(
          product,
          50,
          {
            shipment: ASSETS.entryShipment,
          }
        ),
      ]);

    });

    it('should create an exit allocation', function () {

      return allocationCtrl.allocateExit(
        ASSETS.exitShipment,
        product,
        -40
      )
      .then((allocation) => {
        allocation.quantity.should.eql(-40);
      })
      .catch(aux.logError);

    });

    it('should check for quantity available for allocation prior to creating exit allocation', function () {

      return allocationCtrl.allocateExit(
        ASSETS.exitShipment,
        product,
        -40
      )
      .then(() => {
        return allocationCtrl.allocateExit(
          ASSETS.exitShipment,
          product,
          -41
        );
      })
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ProductNotAvailable');
      })
      .catch(aux.logError);

    });

  });


});
