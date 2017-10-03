const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');
const clone    = require('clone');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

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

  describe('#registerEntry(product, quantity, entryShipment, operationData)', function () {
    it('should register an entry of the given product', function () {

      var productData = clone(SAMPLE_PRODUCT_DATA);
      var shipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);

      return operationCtrl.registerEntry(
        productData,
        10,
        shipmentData
      )
      .then((operation) => {
        operation.kind.should.eql('ProductOperation');
        operation.type.should.eql('entry');
        operation.product.model._id.toString().should.eql(productData.model._id);
        operation.product.model.description.should.eql(productData.model.description);
        operation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
        operation.product.sourceShipment._id.toString().should.eql(shipmentData._id);
        operation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        operation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
        operation.quantity.should.eql(10);
      });
    });

    it('entryShipment is optional if the product has a sourceShipment', function () {
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var shipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);

      productData.sourceShipment = shipmentData;

      return operationCtrl.registerEntry(
        productData,
        10
      )
      .then((operation) => {
        operation.product.sourceShipment._id.toString().should.eql(shipmentData._id);
      });
    });
  });

  describe('#registerExit(product, quantity, exitShipment, operationData)', function () {
    it('should register an exit of the given product', function () {

      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var exitShipmentData = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      return operationCtrl.registerEntry(
        productData,
        10
      )
      .then(() => {
        return operationCtrl.registerExit(
          productData,
          -10,
          exitShipmentData
        )
      })
      .then((operation) => {
        operation.kind.should.eql('ProductOperation');
        operation.type.should.eql('exit');
        operation.category.should.eql('normal');
        operation.product.model._id.toString().should.eql(productData.model._id);
        operation.product.model.description.should.eql(productData.model.description);
        operation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
        operation.product.sourceShipment._id.toString().should.eql(entryShipmentData._id);
        operation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        operation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
        operation.quantity.should.eql(-10);
      });
    });

    it('should refuse to register exit for product with not enough units in stock', function () {
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var productData = clone(SAMPLE_PRODUCT_DATA);
      var exitShipmentData = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      return operationCtrl.registerEntry(
        productData,
        9
      )
      .then(() => {
        return operationCtrl.registerExit(
          productData,
          -10,
          exitShipmentData
        )
      })
      .then(aux.errorExpected, (err) => {
        err.should.be.instanceof(makeCebola.errors.ProductNotAvailable);
      });
    });
  });

  describe('#registerLoss(product, quantity, operationData)', function () {
    it('should register an exit of the given product', function () {

      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var productData = clone(SAMPLE_PRODUCT_DATA);

      productData.sourceShipment = entryShipmentData;

      return operationCtrl.registerEntry(
        productData,
        10
      )
      .then(() => {
        return operationCtrl.registerLoss(
          productData,
          -10
        )
      })
      .then((operation) => {
        operation.kind.should.eql('ProductOperation');
        operation.type.should.eql('exit');
        operation.category.should.eql('loss');
        operation.product.model._id.toString().should.eql(productData.model._id);
        operation.product.model.description.should.eql(productData.model.description);
        operation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
        operation.product.sourceShipment._id.toString().should.eql(entryShipmentData._id);
        operation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        operation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
        operation.quantity.should.eql(-10);
      });
    });
  });


  describe('#registerCorrection(product, quantity, operationData)', function () {
    it('should entry correction operation if quantity is positive', function () {

      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var productData = clone(SAMPLE_PRODUCT_DATA);

      productData.sourceShipment = entryShipmentData;
      
      return operationCtrl.registerCorrection(
        productData,
        10
      )
      .then((operation) => {
        operation.kind.should.eql('ProductOperation');
        operation.type.should.eql('entry');
        operation.category.should.eql('correction');
        operation.product.model._id.toString().should.eql(productData.model._id);
        operation.product.model.description.should.eql(productData.model.description);
        operation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
        operation.product.sourceShipment._id.toString().should.eql(entryShipmentData._id);
        operation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        operation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
        operation.quantity.should.eql(10);
      });
    });

    it('should exit correction operation if quantity is negative', function () {

      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var productData = clone(SAMPLE_PRODUCT_DATA);

      productData.sourceShipment = entryShipmentData;
      
      return operationCtrl.registerCorrection(
        productData,
        10
      )
      .then(() => {
        return operationCtrl.registerCorrection(
          productData,
          -10
        )
      })
      .then((operation) => {
        operation.kind.should.eql('ProductOperation');
        operation.type.should.eql('exit');
        operation.category.should.eql('correction');
        operation.product.model._id.toString().should.eql(productData.model._id);
        operation.product.model.description.should.eql(productData.model.description);
        operation.product.expiry.should.eql(moment(productData.expiry).endOf('day').toDate());
        operation.product.sourceShipment._id.toString().should.eql(entryShipmentData._id);
        operation.product.unitPrice.value.should.eql(productData.unitPrice.value);
        operation.product.unitPrice.currency.should.eql(productData.unitPrice.currency);
        operation.quantity.should.eql(-10);
      });
    });
  });
});
