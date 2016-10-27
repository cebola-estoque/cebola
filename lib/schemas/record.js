// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');
const Bluebird = require('bluebird');

// constants
const Schema = mongoose.Schema;
const errors = require('../errors');

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

    quantity: {
      value: {
        type: Number,
        required: true,
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

  /**
   * Summarizes the records given a query.
   *
   * Returns an array of summarized data aggregated by
   *   - productModel
   *   - productExpiry
   *   - quantityUnit
   * 
   * @param {Object} query
   * 
   * @return {Bluebird -> Array}
   */
  recordSchema.statics.summary = function (query, filter) {
    query = query || {};
    filter = filter || {};

    var aggregation = this.aggregate();

    // match the aggregation query
    aggregation.match(query);

    // sort by productExpiry
    aggregation.sort({
      productExpiry: -1,
    });

    aggregation.group({
      _id: {
        productModelId: '$productModel._id',
        productExpiry: '$productExpiry',
        quantityUnit: '$quantity.unit',
      },

      quantityValue: {
        $sum: '$quantity.value',
      },

      productModel: {
        $last: '$productModel',
      },
    });

    // // filter out productModels
    // if (options.positiveOnly) {
    //   filter.quantityValue = { $gt: 0 };
    // }

    // project the results to be returned as the LAST step
    aggregation.project({
      _id: 0,
      productModel: 1,
      'quantity.value': '$quantityValue',
      'quantity.unit': '$_id.quantityUnit',
      productExpiry: '$_id.productExpiry',
    });

    // ATTENTION: this `match` operation is purposely
    // run AFTER the grouping operation, so that
    // it matches against the results from the grouping phase
    aggregation.match(filter);

    return aggregation.exec();
  };

  recordSchema.statics.shipmentSummary = function (shipment, query, filter) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    query = query || {};

    query['shipment._id'] = shipment._id.toString();

    return operationCtrl.summary(query, filter);
  };

  recordSchema.statics.productSummary = function (productModel, productExpiry, quantityUnit, query, filter) {
    if (!productModel) { return Bluebird.reject(new errors.InvalidOption('productModel', 'required')); }
    if (!productExpiry) { return Bluebird.reject(new errors.InvalidOption('productExpiry', 'required')); }
    if (!quantityUnit) { return Bluebird.reject(new errors.InvalidOption('quantityUnit', 'required')); }

    query = query || {};

    query['productModel._id'] = productModel._id.toString();
    // ensure the product expiry is at the right format
    query['productExpiry'] = makeProductExpiryDate(productExpiry);
    query['quantity.unit'] = quantityUnit;

    return this.summary(query, filter).then((summary) => {

      if (summary.length === 0) {
        // the product is not in stock or has quantity.value === 0
        return {
          productModel: productModel.toJSON(),
          quantity: {
            value: 0,
            unit: quantityUnit,
          },
          productExpiry: 0
        };
      } else {
        return summary[0];
      }
    });
  }



  return recordSchema;
};
