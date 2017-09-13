const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');
const moment   = require('moment');
const clone    = require('clone');

const aux = require('../../aux');

const makeCebola = require('../../../lib');

describe('recordCtrl', function () {

  var ASSETS;
  var recordCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        recordCtrl  = ASSETS.cebola.record;
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

  describe('#listByShipment(shipment, option)', function () {

    it('should list records by shipment', function () {

      var productData = clone(SAMPLE_PRODUCT_DATA);
      var entryShipmentData = clone(SAMPLE_ENTRY_SHIPMENT_DATA);
      var exitShipmentData = clone(SAMPLE_EXIT_SHIPMENT_DATA);

      productData.sourceShipment = entryShipmentData;

      var entryShipment = new ASSETS.cebola.models.Shipment(entryShipmentData);
      var exitShipment = new ASSETS.cebola.models.Shipment(exitShipmentData);

      entryShipment.setStatus('scheduled', 'TestReason');
      exitShipment.setStatus('scheduled', 'TestReason');

      // create shipments
      return Bluebird.all([
        entryShipment.save(),
        exitShipment.save()
      ])
      .then(() => {
        // register entries
        return Bluebird.all([
          ASSETS.cebola.operation.registerEntry(productData, 100, entryShipment),
          ASSETS.cebola.operation.registerEntry(productData, 150, entryShipment),
          ASSETS.cebola.operation.registerEntry(productData, 200, entryShipment)
        ]);
      })
      .then(() => {
        // allocate exits
        return Bluebird.all([
          ASSETS.cebola.allocation.allocateExit(productData, -20, exitShipmentData),
          ASSETS.cebola.allocation.allocateExit(productData, -30, exitShipmentData),
          ASSETS.cebola.allocation.allocateExit(productData, -40, exitShipmentData),
        ]);
      })
      .then((allocations) => {
        // effectivate exits
        return Bluebird.all(allocations.map((alloc) => {
          return ASSETS.cebola.allocation.effectivateExit(alloc, -20);
        }));
      })
      .then(() => {
        return recordCtrl.listByShipment(exitShipment, {
          loadFullProductSourceShipment: true
        })
      })
      .then((exitShipmentRecords) => {
        exitShipmentRecords.length.should.eql(6);

        exitShipmentRecords.filter((record) => {
          return record.kind === 'ProductOperation';
        }).length.should.eql(3);

        exitShipmentRecords.filter((record) => {
          return record.kind === 'ProductAllocation';
        }).length.should.eql(3);

        exitShipmentRecords.forEach((record) => {
          // sourceShipment should refer to the entry shipment
          record.product.sourceShipment.scheduledFor.should.eql(
            entryShipment.scheduledFor
          );
        })
      })
      .catch(aux.logError);

    });

  });
});
