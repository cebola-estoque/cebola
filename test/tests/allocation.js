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
          cebola.productModel.create({
            description: 'Test Product',
            sku: '12345678',
          })
        ]);
      })
      .then((results) => {
        ASSETS.supplier = results[0];
        ASSETS.productModel = results[1];

        return ASSETS.cebola.shipment.scheduleEntry(
          ASSETS.supplier,
          {
            scheduledFor: moment().add(1, 'day'),
          }
        );
      })
      .then((shipment) => {
        ASSETS.shipment = shipment;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('#allocate(shipment, allocationData)', function () {

    it('should create an allocation associated to the given shipment', function () {

      return allocationCtrl.allocate(ASSETS.shipment, {
        productModel: ASSETS.productModel,
        productExpiry: moment().add(2, 'day').toDate(),
        quantity: {
          value: 20,
          unit: 'kg'
        }
      })
      .then((allocation) => {

        allocation.shipment._id.should.eql(ASSETS.shipment._id.toString());
        allocation.productModel._id.should.eql(ASSETS.productModel._id.toString());

      })
      .catch((err) => {
        console.log(err);

        throw err;
      });
    });
  });

});
