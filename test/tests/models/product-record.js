const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');
const clone    = require('clone');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

describe('ProductRecord', function () {

  var ASSETS;
  var ProductRecord;
  var ProductAllocation;
  var ProductOperation;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        ProductRecord = ASSETS.cebola.models.ProductRecord;
        ProductAllocation = ASSETS.cebola.models.ProductAllocation;
        ProductOperation = ASSETS.cebola.models.ProductOperation;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('ProductRecord static methods', function () {

    describe('#normalizeExpiryDate(date)', function () {
      it('should return a date that is at the last of the given date', function () {

        var d = new Date();

        ProductRecord.normalizeExpiryDate(d)
          .should.eql(moment(d).endOf('day').toDate());
      });
    });

    describe('#normalizeMeasureUnit(measureUnit)', function () {
      it('should uppercase the measureUnit', function () {
        ProductRecord.normalizeMeasureUnit('Kg')
          .should.eql('KG');
      });
    });
  });

  describe('ProductRecord#product', function () {
    /**
     * The ProductRecord#product property constitutes the identifier used
     * for inventory calculation.
     * It is composed of 4 attributes:
     *   - model._id
     *   - expiry
     *   - measureUnit
     *   - sourceShipment._id
     */

    var SAMPLE_RECORD_DATA = {
      kind: 'allocation',
      type: 'entry',
      product: {
        model: {
          _id: mongoose.Types.ObjectId(),
          description: 'Some product model',
        },
        expiry: new Date(),
        measureUnit: 'KG',
        sourceShipment: {
          _id: mongoose.Types.ObjectId(),
          number: 1,
        },
        unitPrice: {
          value: 1050, // price is given in cents
          currency: 'BRL',
        }
      }
    };

    it('should store all product information', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      var record = new ProductRecord(recordData);

      return record.save().then((record) => {

        record.product.model._id.should.eql(SAMPLE_RECORD_DATA.product.model._id);
        record.product.model.description.should.eql(SAMPLE_RECORD_DATA.product.model.description);

        // product expiry should be always at the end of the day
        record.product.expiry.should.eql(
          moment(SAMPLE_RECORD_DATA.product.expiry).endOf('day').toDate()
        );

        record.product.measureUnit.should.eql(SAMPLE_RECORD_DATA.product.measureUnit);

        record.product.sourceShipment._id.should.eql(SAMPLE_RECORD_DATA.product.sourceShipment._id);
      });
    });

    it('should require product.model._id and product.model.description', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      delete recordData.product.model;

      var record = new ProductRecord(recordData);

      return record.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });

    it('should require product.expiry', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      delete recordData.product.expiry;

      var record = new ProductRecord(recordData);

      return record.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });

    it('should require product.measureUnit', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      delete recordData.product.measureUnit;

      var record = new ProductRecord(recordData);

      return record.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });

    it('should require product.sourceShipment._id', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      delete recordData.product.sourceShipment;

      var record = new ProductRecord(recordData);

      return record.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });

    it('should default product.unitPrice.value to 0', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      delete recordData.product.unitPrice.value;

      var record = new ProductRecord(recordData);

      return record.save().then((record) => {
        record.product.unitPrice.value.should.eql(0);
      });
    });

    it('should require product.unitPrice.currency', function () {
      var recordData = clone(SAMPLE_RECORD_DATA);
      delete recordData.product.unitPrice.currency;

      var record = new ProductRecord(recordData);

      return record.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError);
      });
    });
  });

});
