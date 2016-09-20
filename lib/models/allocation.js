// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

// constants
const Schema = mongoose.Schema;
const CONSTANTS = require('../constants');

/**
 * Auxiliary schema that defines an operation
 * 
 * @type {Schema}
 */
var allocationSchema = new Schema({

  shipment: {
    _id: {
      type: String,
      required: true,
    },
  },

  productModel: {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    }
  },

  productExpiry: {
    type: Date,
    required: true,
    validate: {
      validator: function (exp) {
        return moment(exp).isAfter(Date.now());
      },
      message: '{VALUE} is an expired date',
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

  type: {
    type: String,
    required: true,
    validate: {
      validator: function (type) {
        return TYPES.indexOf(type) !== -1;
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

          if (type === 'entry') {
            return quantityValue > 0;
          } else if (type === 'exit' || type === 'loss') {
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
});

/**
 * Normalize data before validation is run
 */
allocationSchema.pre('validate', function (next) {

  /**
   * Ensure productExpiry is set to the
   * end of the day the date refers to.
   */
  this.productExpiry = moment(this.productExpiry).endOf('day');

  next();
});

module.exports = function (conn, app, options) {

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
