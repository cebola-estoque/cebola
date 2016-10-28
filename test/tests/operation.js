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
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('#registerEntry(product, quantity, operationData)', function () {

    it('should create an entry operation associated to the given shipment', function () {

      var shipment = aux.mockData.entryShipments[0];
      var product  = {
        model: aux.mockData.productModels[0],
        expiry: moment().add(5, 'day'),
        measureUnit: 'kg',
      };

      return operationCtrl.registerEntry(
        product,
        20,
        {
          shipment: shipment,
        }
      )
      .then((operation) => {

        operation.shipment._id.should.eql(shipment._id.toString());
        operation.product.model._id.should.eql(product.model._id.toString());

        // check that the operation modifies the operation summary
        return ASSETS.cebola.inventory.productSummary(product);

      })
      .then((summary) => {
        summary.allocatedForEntry.should.eql(0);
        summary.allocatedForExit.should.eql(0);
        summary.inStock.should.eql(20);
        summary.quantity.should.eql(20);
      })
      .catch(aux.logError);
    });
  });

  describe('#registerExit(shipment, product, quantity)', function () {

    var entryShipment = aux.mockData.entryShipments[0];
    var exitShipment  = aux.mockData.exitShipments[0];
    var product  = {
      model: aux.mockData.productModels[0],
      expiry: moment().add(5, 'day'),
      measureUnit: 'kg',
    };

    beforeEach(function () {

      return Bluebird.all([
        operationCtrl.registerEntry(
          product,
          20,
          {
            shipment: entryShipment,
          }
        ),
        operationCtrl.registerEntry(
          product,
          70,
          {
            shipment: entryShipment,
          }
        ),
      ]);
    });

    it('should register an exit operation associated to the given shipment', function () {

      return operationCtrl.registerExit(
        product,
        -20,
        {
          shipment: exitShipment,
        }
      )
      .then((exitOperation) => {
        exitOperation.shipment._id.should.eql(exitShipment._id.toString());

        // check that exit is taken into account for summaries
        return ASSETS.cebola.inventory.productSummary(product);
      })
      .then((summary) => {
        summary.allocatedForExit.should.eql(0);
        summary.allocatedForEntry.should.eql(0);
        summary.inStock.should.eql(90 - 20);
        summary.quantity.should.eql(90 - 20);
      })
      .catch(aux.logError);
    });

    it('should ensure that the quantity requested is available', function () {

      return operationCtrl.registerExit(
        product,
        -100,
        {
          shipment: exitShipment,
        }
      )
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ProductNotAvailable');
      });
    });
  });

  describe('#listByShipment(shipment)', function () {

    var entryShipment = aux.mockData.entryShipments[0];
    var exitShipment  = aux.mockData.exitShipments[1];
    var product  = {
      model: aux.mockData.productModels[0],
      expiry: moment().add(5, 'day'),
      measureUnit: 'kg',
    };

    it('should list operations related to the given shipment', function () {

      var productExpiry = moment().add(2, 'day').toDate()

      return Bluebird.all([
        operationCtrl.registerEntry(
          product,
          20,
          {
            shipment: entryShipment,
          }
        ),
        operationCtrl.registerEntry(
          product,
          40,
          {
            shipment: entryShipment,
          }
        ),
      ])
      .then(() => {

        // register an exit operation
        return operationCtrl.registerExit(
          product,
          -50,
          {
            shipment: exitShipment,
          }
        );
      })
      .then(() => {
        return Bluebird.all([
          operationCtrl.listByShipment(entryShipment),
          operationCtrl.listByShipment(exitShipment),
        ]);
      })
      .then((results) => {
        var entryOperations = results[0];
        var exitOperations  = results[1];

        entryOperations.length.should.eql(2);
        exitOperations.length.should.eql(1);
      })
      .catch((err) => {
        console.warn(err);
        throw err;
      })
    });
  });

  describe('#registerLoss(lossData)', function () {
    var entryShipment = aux.mockData.entryShipments[0];
    var exitShipment  = aux.mockData.exitShipments[1];
    var product  = {
      model: aux.mockData.productModels[0],
      expiry: moment().add(5, 'day'),
      measureUnit: 'kg',
    };

    beforeEach(function () {
      return Bluebird.all([
        operationCtrl.registerEntry(
          product,
          20,
          {
            shipment: entryShipment,
          }
        ),
        operationCtrl.registerEntry(
          product,
          70,
          {
            shipment: entryShipment,
          }
        ),
      ]);
    });

    it('should register a loss of a product', function () {
      return operationCtrl.registerLoss(
        product,
        -90
      )
      .then((exitOperation) => {
        // check that exit is taken into account for summaries
        return ASSETS.cebola.inventory.productSummary(product);
      })
      .then((summary) => {
        // loss equals the total available before loss,
        // thus the product should not appear anymore in the summary
        summary.quantity.should.eql(0);
        summary.allocatedForEntry.should.eql(0);
        summary.allocatedForExit.should.eql(0);
        summary.inStock.should.eql(0);
      })
      .catch(aux.logError);
    });

    it('should ensure the quantity to be lost is in stock', function () {
      return operationCtrl.registerLoss(
        product,
        -91
      )
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ProductNotAvailable');
      });
    });
  });

});
