// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

const CONSTANTS = require('../../constants');

module.exports = function (ProductRecord, conn, cebola, options) {

  /**
   * Schema only applied to ProductRecords of the kind `allocation`.
   */
  var allocationSchema = new mongoose.Schema({
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
          return moment(date).isBefore(moment(this.product.expiry).endOf('day'));
        },
        message: 'The operation scheduling is for after the product\'s expiry {VALUE}'
      }
    },

    /**
     * Special property that identifies original allocated quantity.
     * Immutable 
     * @type {Object}
     */
    allocatedQuantity: {
      type: Number,
      required: true,
    },
  }, {
    discriminatorKey: CONSTANTS.PRODUCT_RECORD_DISCRIMINATOR_KEY
  });


  allocationSchema.pre('validate', function (next) {
    this.allocatedQuantity = this.quantity;

    next();
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

  // if (options.schemas && options.schemas.allocation) {
  //   options.schemas.allocation(allocationSchema);
  // }

  var ProductAllocation = ProductRecord.discriminator(
    'ProductAllocation',
    allocationSchema
  );

  return ProductAllocation;
};
