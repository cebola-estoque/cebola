const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('operationCtrl', function () {

  var ASSETS;
  var operationCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        operationCtrl = ASSETS.cebola.operation;

        // create required database entries:
        // - supplier
        // - productModel
        return Bluebird.all([
          cebola.organization.create({
            name: 'Test Organization 1',
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

  describe('#registerEntry(shipment, operationData)', function () {

    it('should create an entry operation associated to the given shipment', function () {

      return operationCtrl.registerEntry(ASSETS.entryShipment, {
        productModel: ASSETS.productModel,
        productExpiry: moment().add(2, 'day').toDate(),
        quantity: {
          value: 20,
          unit: 'kg'
        }
      })
      .then((operation) => {

        operation.shipment._id.should.eql(ASSETS.entryShipment._id.toString());
        operation.productModel._id.should.eql(ASSETS.productModel._id.toString());

        // check that the operation modifies the operation summary
        return ASSETS.cebola.inventory.operationsSummary({
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

  describe('#registerExit(shipment, operationData)', function () {

    var productExpiry = moment().add(2, 'day').toDate();

    beforeEach(function () {
      return Bluebird.all([
        operationCtrl.registerEntry(ASSETS.entryShipment, {
          productModel: ASSETS.productModel,
          productExpiry: productExpiry,
          quantity: {
            value: 20,
            unit: 'kg'
          }
        }),
        operationCtrl.registerEntry(ASSETS.entryShipment, {
          productModel: ASSETS.productModel,
          productExpiry: productExpiry,
          quantity: {
            value: 70,
            unit: 'kg'
          }
        }),
      ]);
    });

    it('should register an exit operation associated to the given shipment', function () {

      return operationCtrl.registerExit(ASSETS.exitShipment, {
        productModel: ASSETS.productModel,
        productExpiry: productExpiry,
        quantity: {
          value: -20,
          unit: 'kg'
        }
      })
      .then((exitOperation) => {
        exitOperation.shipment._id.should.eql(ASSETS.exitShipment._id.toString());

        // check that exit is taken into account for summaries
        return operationCtrl.productSummary(
          ASSETS.productModel,
          productExpiry,
          'kg'
        );
      })
      .then((summary) => {
        summary[0].quantity.value.should.eql(90 - 20);
      });
    });

    it('should ensure that the quantity requested is available', function () {

      return operationCtrl.registerExit(ASSETS.exitShipment, {
        productModel: ASSETS.productModel,
        productExpiry: productExpiry,
        quantity: {
          value: -100,
          unit: 'kg'
        }
      })
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ProductNotAvailable');
      });
    });
  });

  describe('#registerLoss(lossData)', function () {
    var productExpiry = moment().add(2, 'day').toDate();

    beforeEach(function () {
      return Bluebird.all([
        operationCtrl.registerEntry(ASSETS.entryShipment, {
          productModel: ASSETS.productModel,
          productExpiry: productExpiry,
          quantity: {
            value: 20,
            unit: 'kg'
          }
        }),
        operationCtrl.registerEntry(ASSETS.entryShipment, {
          productModel: ASSETS.productModel,
          productExpiry: productExpiry,
          quantity: {
            value: 70,
            unit: 'kg'
          }
        }),
      ]);
    });

    it('should register a loss of a product', function () {
      return operationCtrl.registerLoss({
        productModel: ASSETS.productModel,
        productExpiry: productExpiry,
        quantity: {
          value: -90,
          unit: 'kg'
        }
      })
      .then((exitOperation) => {
        // check that exit is taken into account for summaries
        return operationCtrl.productSummary(
          ASSETS.productModel,
          productExpiry,
          'kg'
        );
      })
      .then((summary) => {
        // loss equals the total available before loss,
        // thus the product should not appear anymore in the summary
        summary.length.should.eql(0);
      })
      .catch(aux.logError);
    });

    it('should ensure the quantity to be lost is in stock', function () {
      return operationCtrl.registerLoss({
        productModel: ASSETS.productModel,
        productExpiry: productExpiry,
        quantity: {
          value: -91,
          unit: 'kg'
        }
      })
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ProductNotAvailable');
      });
    });
  });

});
