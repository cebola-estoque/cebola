// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');
const Bluebird = require('bluebird');

// constants
const Schema = mongoose.Schema;
const errors = require('../../errors');

const CONSTANTS = require('../../constants');

/**
 * Function that standardizes the expiration date
 * @param  {Date|undefined} date
 * @return {Date|undefined}     
 */
function makeProductExpiryDate(date) {
  return date ? moment(date).endOf('day').toDate() : undefined;
}

module.exports = function (conn, cebola, options) {
  /**
   * Auxiliary schema that defines an operation
   * 
   * @type {Schema}
   */
  var recordSchema = new Schema({
    /**
     * Indicates the type of record
     * 
     * @type {Object}
     */
    type: {
      type: String,
      required: true,
      validate: {
        validator: function (type) {
          return CONSTANTS.VALID_PRODUCT_RECORD_TYPES.indexOf(type) !== -1;
        },
        message: 'Invalid operation type `{VALUE}`'
      }
    },

    /**
     * Product is the virtual combination of
     *   - product model (ProductModel)
     *   - product expiry date (Date)
     *   - product measure unit (String)
     *
     * It was modeled this way so that aggregations are run on this basis.
     * 
     * @type {Object}
     */
    product: {

      model: {
        _id: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        }
      },

      expiry: {
        type: Date,
        required: true,
        validate: {
          validator: function (exp) {
            return moment(exp).isAfter(Date.now());
          },
          message: '{VALUE} is an expired date',
        },
      },

      measureUnit: {
        type: String,
        required: true,
      }
    },

    /**
     * Quantity used for aggregations.
     * Its usage depends upon the type of aggregation.
     *
     * MUST BE DEFINED by ProductAllocation and ProductOperation
     * 
     * @type {Number}
     */
  }, {
    discriminatorKey: CONSTANTS.PRODUCT_RECORD_DISCRIMINATOR_KEY
  });

  /**
   * Normalize data before validation is run
   */
  recordSchema.pre('validate', function (next) {

    /**
     * Ensure product.expiry is set to the
     * end of the day the date refers to.
     */
    if (this.product && this.product.expiry) {
      this.product.expiry = makeProductExpiryDate(this.product.expiry);
    }
   
    next();
  });

  /**
   * Expose special method for making product expiry date.
   * @type {Function}
   */
  recordSchema.statics.makeProductExpiryDate = makeProductExpiryDate;

  var ProductRecord = conn.model('ProductRecord', recordSchema);

  return ProductRecord;
};
