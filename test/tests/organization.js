const should = require('should');

const mongoose = require('mongoose');
const Bluebird = require('bluebird');

const aux = require('../aux');

const makeCebola = require('../../lib');

describe('organizationCtrl', function () {

  var ASSETS;
  var organizationCtrl;

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        return makeCebola(ASSETS.connection, aux.genOptions({}));
      })
      .then((cebola) => {

        ASSETS.cebola = cebola;

        organizationCtrl = ASSETS.cebola.organization;
      });
  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('create', function () {
    it('should create a new organization entry in the database', function () {

      return organizationCtrl.create({
        name: 'Test Organization',
        roles: ['supplier'],
        document: {
          type: 'CNPJ',
          value: '87.023.556/0001-81',
        }
      })
      .then((organization) => {
        mongoose.Types.ObjectId.isValid(organization._id).should.equal(true);
      })
      .catch((err) => {
        console.log(err);

        throw err;
      });

    });
  });

});
