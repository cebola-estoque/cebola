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
        scheduledFor: moment().add(1, 'day'),
      };

      return ASSETS.cebola.shipment.scheduleEntry(
        ASSETS.supplier,
        shipmentData,
        []
      )
      .then((shipment) => {
        console.log(shipment);
      })
      .catch((err) => {
        console.log(err);

        throw err;
      });

    });
  });

});
