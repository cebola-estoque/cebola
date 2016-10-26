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

  describe('#allocateEntry(shipment, productModel, productExpiry, quantityUnit, quantityValue)', function () {

    it('should create an allocation associated to the given shipment', function () {

      return allocationCtrl.allocateEntry(
        ASSETS.entryShipment,
        ASSETS.productModel,
        moment().add(2, 'day').toDate(),
        'kg',
        20
      )
      .then((allocation) => {

        allocation.shipment._id.should.eql(ASSETS.entryShipment._id.toString());
        allocation.productModel._id.should.eql(ASSETS.productModel._id.toString());

        // check that the allocation modifies the allocation summary
        return allocationCtrl.summary({
          'productModel._id': ASSETS.productModel._id.toString(),
        });

      })
      .then((summary) => {

        summary.length.should.eql(1);

        summary[0].quantity.value.should.eql(20);

      })
      .catch((err) => {
        console.log(err);

        throw err;
      });
    });
  });

  describe('#allocateExit(shipment, productModel, productExpiry, quantityUnit, quantityValue)', function () {
    var productExpiry = moment().add(2, 'day').toDate();

    beforeEach(function () {

      // create some operations so that the product may be considered in stock
      return Bluebird.all([
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          ASSETS.productModel,
          productExpiry,
          'kg',
          30
        ),
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          ASSETS.productModel,
          productExpiry,
          'kg',
          50
        ),
      ]);

    });

    it('should create an exit allocation', function () {

      return allocationCtrl.allocateExit(
        ASSETS.exitShipment,
        ASSETS.productModel,
        productExpiry,
        'kg',
        -40
      )
      .then((allocation) => {
        allocation.quantity.value.should.eql(-40);
      })
      .catch(aux.logError);

    });

    it('should check for quantity available for allocation prior to creating exit allocation', function () {

      return allocationCtrl.allocateExit(
        ASSETS.exitShipment,
        ASSETS.productModel,
        productExpiry,
        'kg',
        -40
      )
      .then(() => {
        return allocationCtrl.allocateExit(
          ASSETS.exitShipment,
          ASSETS.productModel,
          productExpiry,
          'kg',
          -41
        );
      })
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ProductNotAvailable');
      })
      .catch(aux.logError);

    });

  });

  describe('#computeProductAvailability(productModel, productExpiry, quantityUnit, targetDate)', function () {
    var productExpiry = moment().add(2, 'day').toDate();

    beforeEach(function () {

      // create some operations so that the product may be considered in stock
      return Bluebird.all([
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          ASSETS.productModel,
          productExpiry,
          'kg',
          30
        ),
        ASSETS.cebola.operation.registerEntry(
          ASSETS.entryShipment,
          ASSETS.productModel,
          productExpiry,
          'kg',
          50
        ),
      ])
      .then(() => {
        return Bluebird.all([
          // exit 30
          allocationCtrl.allocateExit(
            ASSETS.exitShipment,
            ASSETS.productModel,
            productExpiry,
            'kg',
            -30
          ),

          // enter 50
          allocationCtrl.allocateEntry(
            ASSETS.entryShipment,
            ASSETS.productModel,
            productExpiry,
            'kg',
            50
          ),
        ]);
      })
      .catch(aux.logError);

    });

    it('should check amount in stock and deduce exit allocations', function () {
      return allocationCtrl.computeProductAvailability(
        ASSETS.productModel,
        productExpiry,
        'kg',
        // before the entry allocation
        moment().add(1, 'hour').toDate()
      )
      .then((available) => {

        // should count all in stock minus amount allocated for exit
        available.should.eql(50);
      });
    });

    it('should take into account entry allocations up to the targetDate', function () {
      return allocationCtrl.computeProductAvailability(
        ASSETS.productModel,
        productExpiry,
        'kg',
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


});
