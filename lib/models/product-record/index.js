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

    shipment: {
      _id: {
        type: String,
      },
    },

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

    quantity: {
      type: Number,
      required: true,
    },
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

  /**
   * Summarizes the records given a query.
   *
   * Returns an array of summarized data aggregated by
   *   - productModel
   *   - productExpiry
   *   - productMeasureUnit
   * 
   * @param {Object} query
   * 
   * @return {Bluebird -> Array}
   */
  // recordSchema.statics.summary = function (query, filter) {
  //   query = query || {};
  //   filter = filter || {};

  //   var aggregation = this.aggregate();

  //   // match the aggregation query
  //   aggregation.match(query);

  //   // sort by productExpiry
  //   aggregation.sort({
  //     productExpiry: -1,
  //   });

  //   aggregation.group({
  //     _id: {
  //       productModelId: '$product.model._id',
  //       productExpiry: '$product.expiry',
  //       productMeasureUnit: '$product.measureUnit',
  //     },

  //     quantity: {
  //       $sum: '$quantity.value',
  //     },

  //     inStock: {
  //       $sum: {
  //         $cond: {
  //           if: { $eq: ['$kind', 'ProductOperation'] },
  //           then: '$quantity.value',
  //           else: 0,
  //         }
  //       }
  //     },

  //     allocated: {
  //       $sum: {
  //         $cond: {
  //           if: { $eq: ['$kind', 'ProductAllocation'] },
  //           then: '$quantity.value',
  //           else: 0,
  //         }
  //       }
  //     },

  //     productModel: {
  //       $last: '$productModel',
  //     },
  //   });

  //   // // filter out productModels
  //   // if (options.positiveOnly) {
  //   //   filter.quantity = { $gt: 0 };
  //   // }

  //   // project the results to be returned as the LAST step
  //   aggregation.project({
  //     _id: 0,
  //     allocated: 1,
  //     inStock: 1,
  //     product: 1,
  //   });

  //   // ATTENTION: this `match` operation is purposely
  //   // run AFTER the grouping operation, so that
  //   // it matches against the results from the grouping phase
  //   aggregation.match(filter);

  //   return aggregation.exec();
  // };

  // recordSchema.statics.shipmentSummary = function (shipment, query, filter) {
  //   if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

  //   query = query || {};

  //   query['shipment._id'] = shipment._id.toString();

  //   return operationCtrl.summary(query, filter);
  // };

  // recordSchema.statics.productSummary = function (product, query, filter) {
  //   if (!product.model) { return Bluebird.reject(new errors.InvalidOption('product.model', 'required')); }
  //   if (!product.expiry) { return Bluebird.reject(new errors.InvalidOption('product.expiry', 'required')); }
  //   if (!product.unit) { return Bluebird.reject(new errors.InvalidOption('product.unit', 'required')); }

  //   query = query || {};

  //   query['productModel._id'] = product.model._id.toString();
  //   // ensure the product expiry is at the right format
  //   query['productExpiry'] = makeProductExpiryDate(product.expiry);
  //   query['quantity.unit'] = product.unit;

  //   return this.summary(query, filter).then((summary) => {

  //     if (summary.length === 0) {
  //       // the product is not in stock or has quantity.value === 0
  //       return {
  //         productModel: product.model.toJSON(),
  //         quantity: {
  //           value: 0,
  //           unit: product.unit,
  //         },
  //         productExpiry: product.expiry,
  //       };
  //     } else {
  //       return summary[0];
  //     }
  //   });
  // }

  var ProductRecord = conn.model('ProductRecord', recordSchema);

  return ProductRecord;
};
