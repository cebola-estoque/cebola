const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

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
            description: 'Test Product 1',
            sku: '12345678',
          }),
          cebola.productModel.create({
            description: 'Test Product 2',
            sku: '12345678',
          })
        ]);
      })
      .then((results) => {
        ASSETS.supplier = results[0];
        ASSETS.productModel1 = results[1];
        ASSETS.productModel2 = results[2];


        return ASSETS.cebola.shipment.scheduleEntry(
          ASSETS.supplier,
          {
            scheduledFor: moment().add(1, 'day'),
          },
          [
            {
              productModel: {
                _id: ASSETS.productModel1._id.toString(),
                description: ASSETS.productModel1.description,
              },
              quantity: {
                value: 20,
                unit: 'kg'
              }
            },
            {
              productModel: {
                _id: ASSETS.productModel1._id.toString(),
                description: ASSETS.productModel1.description,
              },
              quantity: {
                value: 30,
                unit: 'kg'
              }
            },
            {
              productModel: {
                _id: ASSETS.productModel2._id.toString(),
                description: ASSETS.productModel2.description,
              },
              quantity: {
                value: 33,
                unit: 'kg'
              }
            }
          ]
        );
      })
      .then((shipment) => {
        ASSETS.shipment = shipment;

        return ASSETS.cebola.models.Allocation.find({
          'shipment._id': shipment._id.toString(),
        });
      })
      .then((allocations) => {
        ASSETS.allocations = allocations;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('#allocationsSummary(query)', function () {

    it('should compute a summary of allocations that match the given query', function () {

      return ASSETS.cebola.inventory.allocationsSummary({
        'productModel._id': ASSETS.productModel1._id.toString()
      })
      .then((summary) => {

        summary.length.should.eql(1);
        summary[0].quantity.value.should.eql(50);
        summary[0].quantity.unit.should.eql('kg');
      })
      .catch((err) => {
        console.log(err);

        throw err;
      });

    });

  });

});
