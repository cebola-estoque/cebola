const should = require('should')

const mongoose = require('mongoose')
const Bluebird = require('bluebird')
const moment   = require('moment')
const clone    = require('clone')

const aux = require('../../aux')

const makeCebola = require('../../../lib')

describe('ProductOperation', function () {

  var ASSETS
  var ProductOperation

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets

        return makeCebola(ASSETS.connection, aux.genOptions({}))
      })
      .then((cebola) => {

        ASSETS.cebola = cebola

        ProductOperation = ASSETS.cebola.models.ProductOperation
      })
  })

  afterEach(function () {
    return aux.teardown()
  })

  const SAMPLE_PRODUCT_OPERATION_DATA = {
    type: 'entry',
    quantity: 10,
    product: {
      model: {
        _id: mongoose.Types.ObjectId(),
        description: 'Some product',
      },
      expiry: new Date(),
      measureUnit: 'KG',
      sourceShipment: {
        _id: mongoose.Types.ObjectId(),
        number: 1,
      }
    },
    status: {
      value: 'operation-active',
      reason: 'TestReason',
    }
  }

  describe('ProductOperation#kind', function () {
    it('should use `operation` as `kind`', function () {
      var operationData = clone(SAMPLE_PRODUCT_OPERATION_DATA)
      var operation = new ProductOperation(operationData)

      return operation.save().then((operationRecord) => {
        operationRecord.kind.should.eql('ProductOperation')
        operationRecord.type.should.eql('entry')
        operationRecord.category.should.eql('normal')
      })
    })
  })

  describe('ProductOperation#quantity', function () {

    it('should require the operation\'s quantity to match the operation type: exit < 0', function () {
      
      var operationData = clone(SAMPLE_PRODUCT_OPERATION_DATA)
      operationData.quantity = 10
      operationData.type = 'exit'
      var operation = new ProductOperation(operationData)

      return operation.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError)
      })
    })

    it('should require the operation\'s quantity to match the operation type: entry > 0', function () {
      var operationData = clone(SAMPLE_PRODUCT_OPERATION_DATA)
      operationData.quantity = -10
      operationData.type = 'entry'
      var operation = new ProductOperation(operationData)

      return operation.save().then(aux.errorExpected, (err) => {
        err.should.be.instanceof(mongoose.Error.ValidationError)
      })
    })

  })

})
