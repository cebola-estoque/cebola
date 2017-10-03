const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');
const clone    = require('clone');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

describe('allocationCtrl', function () {

  var ASSETS;
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

        allocationCtrl = ASSETS.cebola.allocation;
        operationCtrl  = ASSETS.cebola.operation;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  const SAMPLE_PRODUCT_DATA = {
    model: aux.mockData.productModels[0],
    expiry: moment().add(7, 'days').toDate(),
    measureUnit: 'kg',
    unitPrice: {
      value: 1050,
      currency: 'BRL',
    }
  };

  const SAMPLE_ENTRY_SHIPMENT_DATA = aux.mockData.shipments.find(s => {
    return s.type === 'entry';
  });

  const SAMPLE_EXIT_SHIPMENT_DATA = aux.mockData.shipments.find(s => {
    return s.type === 'exit';
  });

  describe('#allocateEntry(product, allocatedQuantity, entryShipment, allocationData)', function () {
    it('should allocate the product for entry', function () {
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var shipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);

      return allocationCtrl.allocateEntry(productData, 30, shipmentData)
        .then((allocation) => {
          allocation.kind.should.eql('ProductAllocation');
          allocation.type.should.eql('entry');
          allocation.product.model._id.toString().should.eql(productData.model._id);
          allocation.product.model.description.should.eql(productData.model.description);
          allocation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
          allocation.product.sourceShipment._id.toString().should.eql(shipmentData._id);
          allocation.product.unitPrice.value.should.eql(productData.unitPrice.value);
          allocation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
          allocation.quantity.should.eql(30);
          allocation.scheduledFor.should.eql(shipmentData.scheduledFor);
          allocation.shipment._id.toString().should.eql(shipmentData._id);
        });
    });
  });

  describe('#allocateExit(product, allocatedQuantity, exitShipment, allocationData)', function () {
    it('should allocate the product for exit', function () {
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      return operationCtrl.registerCorrection(productData, 30)
        .then(() => {
          return allocationCtrl.allocateExit(productData, -30, exitShipmentData)
        })
        .then((allocation) => {
          allocation.kind.should.eql('ProductAllocation');
          allocation.type.should.eql('exit');
          allocation.product.model._id.toString().should.eql(productData.model._id);
          allocation.product.model.description.should.eql(productData.model.description);
          allocation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
          allocation.product.sourceShipment._id.toString().should.eql(entryShipmentData._id);
          allocation.product.unitPrice.value.should.eql(productData.unitPrice.value);
          allocation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
          allocation.quantity.should.eql(-30);
          allocation.scheduledFor.should.eql(exitShipmentData.scheduledFor);
          allocation.shipment._id.toString().should.eql(exitShipmentData._id);
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    });

    it('should refuse to allocate exit for product without enough units in stock or allocated for entry', function () {
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      return operationCtrl.registerCorrection(productData, 30)
        .then(() => {
          return allocationCtrl.allocateExit(productData, -31, exitShipmentData)
        })
        .then(aux.errorExpected, (err) => {
          err.should.be.instanceof(makeCebola.errors.ProductNotAvailable);
        });
    });

    it('should take into account units scheduled for entry up to the exit date', function () {
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      return operationCtrl.registerCorrection(productData, 30)
        .then(() => {
          return allocationCtrl.allocateEntry(productData, 10, entryShipmentData);
        })
        .then(() => {
          return allocationCtrl.allocateExit(productData, -31, exitShipmentData);
        })
        .then((exitAllocation) => {

          exitAllocation.allocatedQuantity.should.eql(-31);

          return allocationCtrl.allocateExit(productData, -10, exitShipmentData);
        })
        .then(aux.errorExpected, (err) => {
          err.should.be.instanceof(makeCebola.errors.ProductNotAvailable);
        });
    });

  });

  describe('#effectivateEntry(entryAllocation, quantity)', function () {
    it('should create an entry operation related to the allocation', function () {
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var shipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);

      // TODO:
      // this method depends on updating the shipment's status
      // we should make it more independent.
      // for the time being, just ensure the shipment exists
      var shipment = new ASSETS.cebola.models.Shipment(shipmentData);

      shipment.setStatus(
        makeCebola.constants.SHIPMENT_STATUSES.SCHEDULED,
        'TestReason'
      );

      var _entryAllocation;

      return shipment.save()
      .then((shipment) => {
        return allocationCtrl.allocateEntry(productData, 30, shipment)
      })
      .then((entryAllocation) => {
        _entryAllocation = entryAllocation;
        return allocationCtrl.effectivateEntry(entryAllocation, 10);
      })
      .then((entryOperation) => {
        entryOperation.quantity.should.eql(10);
        entryOperation.sourceAllocation._id.toString().should.eql(_entryAllocation._id.toString());
        entryOperation.sourceAllocation.number.should.eql(_entryAllocation.number);

        // resulting operation should have the product's unitPrice as well
        entryOperation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        entryOperation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);

        return allocationCtrl.getById(_entryAllocation._id);
      })
      .then((updatedEntryAllocation) => {
        // console.log(updatedEntryAllocation);
        updatedEntryAllocation.allocatedQuantity.should.eql(30);
        updatedEntryAllocation.quantity.should.eql(20);
        updatedEntryAllocation.effectivatedQuantity.should.eql(10);

        // console.log(operation);
      })
      .catch((err) => {
        console.warn(err);
        throw err;
      });
    });
  });

  describe('#effectivateExit(exitAllocation, quantity)', function () {
    it('should create an exit operation related to the exitAllocation', function () {
      var productData       = clone(SAMPLE_PRODUCT_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData  = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      // TODO:
      // this method depends on updating the shipment's status
      // we should make it more independent.
      // for the time being, just ensure the shipment exists
      var exitShipment = new ASSETS.cebola.models.Shipment(exitShipmentData);

      exitShipment.setStatus(
        makeCebola.constants.SHIPMENT_STATUSES.SCHEDULED,
        'TestReason'
      );

      var _exitAllocation;

      return Bluebird.all([
        exitShipment.save(),
        operationCtrl.registerCorrection(productData, 30)
      ])
      .then((results) => {
        return allocationCtrl.allocateExit(productData, -30, exitShipment)
      })
      .then((exitAllocation) => {
        _exitAllocation = exitAllocation;

        return allocationCtrl.effectivateExit(exitAllocation, -10);
      })
      .then((exitOperation) => {
        exitOperation.quantity.should.eql(-10);
        exitOperation.sourceAllocation._id.toString().should.eql(_exitAllocation._id.toString());
        exitOperation.sourceAllocation.number.should.eql(_exitAllocation.number);

        // resulting operation should have the product's unitPrice as well
        exitOperation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        exitOperation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);

        return allocationCtrl.getById(_exitAllocation._id);
      })
      .then((updatedExitAllocation) => {
        // console.log(updatedExitAllocation);
        updatedExitAllocation.allocatedQuantity.should.eql(-30);
        updatedExitAllocation.quantity.should.eql(-20);
        updatedExitAllocation.effectivatedQuantity.should.eql(-10);
      })
    });

    it('should refuse to create an exit operation related to the exitAllocation if there are not enough items in stock', function () {
      var productData       = clone(SAMPLE_PRODUCT_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData  = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      // TODO:
      // this method depends on updating the shipment's status
      // we should make it more independent.
      // for the time being, just ensure the shipment exists
      var exitShipment = new ASSETS.cebola.models.Shipment(exitShipmentData);

      exitShipment.setStatus(
        makeCebola.constants.SHIPMENT_STATUSES.SCHEDULED,
        'TestReason'
      );

      var _exitAllocation

      return Bluebird.all([
        exitShipment.save(),
        operationCtrl.registerCorrection(productData, 30)
      ])
      .then((results) => {
        // first allocate
        return allocationCtrl.allocateExit(productData, -30, exitShipment)
      })
      .then((exitAllocation) => {
        _exitAllocation = exitAllocation;

        // then correct and reduce quantity in stock
        return operationCtrl.registerCorrection(productData, -25);
      })
      .then((correctionOperation) => {
        // then attempt to effectivate
        return allocationCtrl.effectivateExit(_exitAllocation, -10);
      })
      .then(aux.errorExpected, (err) => {
        err.should.be.instanceof(makeCebola.errors.ProductNotAvailable);
      });
    });
  });
});
