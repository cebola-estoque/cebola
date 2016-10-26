// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

const CONSTANTS = require('../constants');

module.exports = function (conn, cebola, options) {

  var allocationSchema = require('../schemas/record')(cebola, options);

  allocationSchema.add({
    type: {
      type: String,
      required: true,
      validate: {
        validator: function (type) {
          return CONSTANTS.VALID_ALLOCATION_TYPES.indexOf(type) !== -1;
        },
        message: 'Invalid operation type `{VALUE}`'
      }
    },

    /**
     * Date for which the allocation is scheduled for.
     * @type {Object}
     */
    scheduledFor: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return moment(date).isBefore(moment(this.productExpiry).endOf('day'));
        },
        message: 'The operation scheduling is for after the product\'s expiry {VALUE}'
      }
    },
  });

  allocationSchema.methods.setShipment = function (shipment) {
    this.set('shipment', {
      _id: shipment._id,
    });

    /**
     * Allocation's type matches the shipment's
     */
    this.set('type', shipment.type);

    /**
     * Allocation's scheduledFor matches the shipment's
     */
    this.set('scheduledFor', shipment.scheduledFor);
  };

  if (options.schemas && options.schemas.allocation) {
    options.schemas.allocation(allocationSchema);
  }

  var Allocation = conn.model('Allocation', allocationSchema);
  
  return Allocation;
};
