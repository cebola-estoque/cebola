// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

// constants
const Schema = mongoose.Schema;

/**
 * Function that standardizes the expiration date
 * @param  {Date|undefined} date
 * @return {Date|undefined}     
 */
function makeProductExpiryDate(date) {
  return date ? moment(date).endOf('day').toDate() : undefined;
}

module.exports = function (app, options) {
  /**
   * Auxiliary schema that defines an operation
   * 
   * @type {Schema}
   */
  var recordSchema = new Schema({

    shipment: {
      _id: {
        type: String,
      },
    },

    productModel: {
      _id: {
        type: String,
        required: true,
      },
      description: {
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
  });

  /**
   * Normalize data before validation is run
   */
  recordSchema.pre('validate', function (next) {

    /**
     * Ensure productExpiry is set to the
     * end of the day the date refers to.
     */
    this.productExpiry = makeProductExpiryDate(this.productExpiry);

    next();
  });

  /**
   * Expose special method for making product expiry date.
   * @type {Function}
   */
  recordSchema.statics.makeProductExpiryDate = makeProductExpiryDate;

  return recordSchema;
};
