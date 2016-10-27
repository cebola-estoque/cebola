const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('shipmentCtrl', function () {

  var ASSETS;
  var shipmentCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        shipmentCtrl = ASSETS.cebola.organization;

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
          cebola.productModel.create({
            description: 'Test Product',
            sku: '12345678',
          })
        ]);
      })
      .then((results) => {
        ASSETS.supplier = results[0];
        ASSETS.productModel = results[1];
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('scheduleEntry', function () {
    it('should scheduleEntry a new entry shipment', function () {

      var shipmentData = {
        scheduledFor: moment().add(1, 'day').toDate(),
      };

      var productExpiry = moment().add(2, 'day').toDate();

      return ASSETS.cebola.shipment.scheduleEntry(
        ASSETS.supplier,
        shipmentData,
        [
          {
            productModel: {
              _id: ASSETS.productModel._id.toString(),
              description: ASSETS.productModel.description,
            },
            productExpiry: productExpiry,
            quantity: {
              value: 20,
              unit: 'kg'
            }
          },
          {
            productModel: {
              _id: ASSETS.productModel._id.toString(),
              description: ASSETS.productModel.description,
            },
            productExpiry: productExpiry,
            quantity: {
              value: 30,
              unit: 'kg'
            }
          }
        ]
      )
      .then((shipment) => {


        shipment.type.should.eql('entry');
        shipment.scheduledFor.should.eql(shipmentData.scheduledFor);

        return ASSETS.cebola.models.Allocation.find({
          'shipment._id': shipment._id.toString(),
        });
      })
      .then((shipmentAllocations) => {
        shipmentAllocations.length.should.eql(2);
      })
      .catch((err) => {
        console.log(err);

        throw err;
      });

    });
  });

  describe('getById(shipmentId, options)', function () {

    beforeEach(function () {
      var shipmentData = {
        scheduledFor: moment().add(1, 'day').toDate(),
      };

      return ASSETS.cebola.shipment.scheduleEntry(
        ASSETS.supplier,
        shipmentData,
        [
          {
            productModel: {
              _id: ASSETS.productModel._id.toString(),
              description: ASSETS.productModel.description,
            },
            productExpiry: moment().add(2, 'day').toDate(),
            quantity: {
              value: 20,
              unit: 'kg'
            }
          },
          {
            productModel: {
              _id: ASSETS.productModel._id.toString(),
              description: ASSETS.productModel.description,
            },
            productExpiry: moment().add(2, 'day').toDate(),
            quantity: {
              value: 30,
              unit: 'kg'
            }
          }
        ]
      )
      .then((shipment) => {
        ASSETS.shipment = shipment;
      })
    });

    it('should retrieve a shipment by its _id attribute', function () {
      return ASSETS.cebola.shipment.getById(ASSETS.shipment._id)
        .then((shipment) => {
          shipment._id.should.eql(ASSETS.shipment._id);
        });
    });

    it.skip('should retrieve the shipment along with its allocation and operation summaries', function () {
      return ASSETS.cebola.shipment.getById(ASSETS.shipment._id, { withSummaries: true })
        .then((shipment) => {
          shipment._id.should.eql(ASSETS.shipment._id);

          shipment.summaries.allocations.length.should.eql(1);
          shipment.summaries.operations.length.should.eql(0);
        });
    });
  });

});
