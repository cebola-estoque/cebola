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
          allocation.product.model._id.should.eql(productData.model._id);
          allocation.product.model.description.should.eql(productData.model.description);
          allocation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
          allocation.product.sourceShipment._id.should.eql(shipmentData._id);
          allocation.quantity.should.eql(30);
          allocation.scheduledFor.should.eql(shipmentData.scheduledFor);
          allocation.shipment._id.should.eql(shipmentData._id);
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
          allocation.product.model._id.should.eql(productData.model._id);
          allocation.product.model.description.should.eql(productData.model.description);
          allocation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
          allocation.product.sourceShipment._id.should.eql(entryShipmentData._id);
          allocation.quantity.should.eql(-30);
          allocation.scheduledFor.should.eql(exitShipmentData.scheduledFor);
          allocation.shipment._id.should.eql(exitShipmentData._id);
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
    it.only('should create an entry operation related to the allocation', function () {
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

      return shipment.save()
        .then((shipment) => {
          return allocationCtrl.allocateEntry(productData, 30, shipmentData)
        })
        .then((entryAllocation) => {
          return allocationCtrl.effectivateEntry(entryAllocation, 10);
        })
        .then((entryAllocation) => {
          // console.log(entryAllocation);
          entryAllocation.allocatedQuantity.should.eql(30);
          entryAllocation.quantity.should.eql(20);
          entryAllocation.effectivatedQuantity.should.eql(10);

          // console.log(operation);
        })
        .catch((err) => {
          console.warn(err);
          throw err;
        });
    });
  });
});
