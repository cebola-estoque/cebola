const should = require('should')

const mongoose = require('mongoose')
const Bluebird = require('bluebird')
const moment   = require('moment')

const aux = require('../../aux')

const makeCebola = require('../../../lib')

describe('Shipment', function () {

  let ASSETS
  let Shipment

  beforeEach(function () {
    return aux.setup()
      .then((assets) => {
        ASSETS = assets

        return makeCebola(ASSETS.connection, aux.genOptions({}))
      })
      .then((cebola) => {

        ASSETS.cebola = cebola

        Shipment = ASSETS.cebola.models.Shipment
      })
  })

  afterEach(function () {
    return aux.teardown()
  })

  describe('Shipment#number', function () {
    it('should auto increment', function () {

      let shipment1 = new Shipment({
        type: 'entry',
        scheduledFor: new Date(),
      })

      let shipment2 = new Shipment({
        type: 'entry',
        scheduledFor: new Date()
      })

      let shipment3 = new Shipment({
        type: 'entry',
        scheduledFor: new Date()
      })

      shipment1.setStatus('scheduled', 'TestReason')
      shipment2.setStatus('scheduled', 'TestReason')
      shipment3.setStatus('scheduled', 'TestReason')

      return shipment1.save().then((shipment1) => {
        shipment1.number.should.eql(1)

        return shipment2.save()
      })
      .then((shipment2) => {
        shipment2.number.should.eql(2)

        return shipment3.save()
      })
      .then((shipment3) => {
        shipment3.number.should.eql(3)
      })

    })
  })

})
