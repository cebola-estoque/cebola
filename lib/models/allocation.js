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

    quantity: {
      value: {
        type: Number,
        required: true,
        validate: {
          type: 'QuantityAndAllocationTypeMismatch',
          validator: function (quantityValue) {
            var type = this.get('type');

            if (type === CONSTANTS.ALLOCATION_TYPES.ENTRY) {
              return quantityValue > 0;
            } else if (type === CONSTANTS.ALLOCATION_TYPES.EXIT) {
              return quantityValue < 0;
            }
          },
          message: 'quantity.value MUST be positive for type `entry` and negative for type `exit`'
        }
      },
      unit: {
        type: String,
        required: true,
      },
    },

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

  var Allocation = conn.model('Allocation', allocationSchema);
  
  return Allocation;
};
