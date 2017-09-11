// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');
const mongooseStatus = require('mongoose-make-status');

const mongooseHistory = require('../../lib/mongoose-history');
const mongooseImmutable = require('../../lib/mongoose-immutable');

const CONSTANTS = require('../../constants');

module.exports = function (ProductRecord, conn, cebola, options) {

  /**
   * Schema only applied to ProductRecords of the kind `allocation`.
   */
  let allocationSchema = new mongoose.Schema({

    /**
     * The shipment this allocation is associated to.
     *
     * For allocations, the shipment reference is required.
     * 
     * @type {Object}
     */
    shipment: {
      _id: {
        type: String,
        required: true,
      },
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
     * @type {Number}
     */
    allocatedQuantity: {
      type: Number,
      required: true,
      validate: {
        validator: function (v) {
          let type = this.get('type');

          switch (type) {
            case CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY:
              return v > 0;
              break;
            case CONSTANTS.PRODUCT_RECORD_TYPES.EXIT:
              return v < 0;
              break;
            default:
              return false;
              break;
          }
        },
        message: '{VALUE} does not match allocation type',
      }
    },

    /**
     * Amount that indicates quantity that was effectivated.
     * @type {Number}
     */
    effectivatedQuantity: {
      type: Number,
      default: 0,
    },

    /**
     * Quantity of units that will be taken into account
     * when calculating inventory
     * 
     * @type {Number}
     */
    quantity: {
      type: Number,
      required: true,
    },
  }, {
    discriminatorKey: CONSTANTS.PRODUCT_RECORD_DISCRIMINATOR_KEY
  });

  /**
   * Statuses for allocation records
   */
  allocationSchema.plugin(mongooseStatus, {
    statuses: CONSTANTS.VALID_ALLOCATION_STATUSES,
  });

  /**
   * Freeze some properties
   */
  allocationSchema.plugin(mongooseImmutable, {
    properties: [
      'type',
    ],
  });

  /**
   * Pre-validate hooks
   */
  allocationSchema.pre('validate', function (next) {
    /**
     * Quantity is always a difference between the 
     * amount allocated and the amount effectivated
     */
    let allocated    = this.allocatedQuantity;
    let effectivated = this.effectivatedQuantity;

    if (!allocated) {
      // let the mongoose validation fail
      next();
      return;
    }

    if (typeof effectivated === 'undefined') {
      this.effectivatedQuantity = effectivated = 0;
    }

    this.quantity = allocated - effectivated;

    next();
  });

  /**
   * Virtual property that checks if all allocated units have been effectively
   * resolved
   * @type {Boolean}
   */
  allocationSchema.virtual('resolutionStatus').get(function () {
    let allocated    = this.allocatedQuantity;
    let effectivated = this.effectivatedQuantity || 0;

    if (allocated > effectivated) {
      return 'insufficient';
    } else if (allocated < effectivated) {
      return 'exceeding';
    } else {
      return 'exact';
    }
  });

  /**
   * Mixin
   */
  if (options.schemas && options.schemas.allocation) {
    options.schemas.allocation(allocationSchema);
  }

  let ProductAllocation = ProductRecord.discriminator(
    'ProductAllocation',
    allocationSchema
  );

  return ProductAllocation;
};
