// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductRecord = cebola.models.ProductRecord;
  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;

  var inventoryCtrl = {};

  inventoryCtrl.summary = function (query, filter, sort) {
    filter = filter || {};

    var aggregation = ProductRecord.aggregate();

    /**
     * Scope the query by allocation and operation statuses
     */
    var allocQuery = {
      'kind': 'ProductAllocation',
    };
    ProductAllocation.scopeQueryByStatuses(allocQuery, [
      CONSTANTS.ALLOCATION_STATUSES.ACTIVE,
    ]);
    var opQuery = {
      'kind': 'ProductOperation',
    };
    ProductOperation.scopeQueryByStatuses(opQuery, [
      CONSTANTS.OPERATION_STATUSES.ACTIVE,
    ]);

    var summaryQuery;

    if (query) {
      summaryQuery ={
        $and: [
          { $or: [allocQuery, opQuery] },
          query
        ]
      };
    } else {
      summaryQuery = { $or: [allocQuery, opQuery] };
    }

    // match the aggregation query
    aggregation.match(summaryQuery);

    if (sort) {
      aggregation.sort(sort);
    }

    aggregation.group({
      _id: {
        productModelId: '$product.model._id',
        productExpiry: '$product.expiry',
        productMeasureUnit: '$product.measureUnit',
      },

      // quantity: {
      //   $sum: '$quantity',
      // },

      // inStock: {
      //   $sum: {
      //     $cond: {
      //       if: { $eq: ['$kind', 'ProductOperation'] },
      //       then: '$quantity',
      //       else: 0,
      //     }
      //   }
      // },

      exited: {
        $sum: {
          $cond: {
            if: {
              $and: [
                { $eq: ['$kind', 'ProductOperation'] },
                { $eq: ['$type', 'exit'] }
              ]
            },
            then: '$quantity',
            else: 0,
          }
        }
      },

      entered: {
        $sum: {
          $cond: {
            if: {
              $and: [
                { $eq: ['$kind', 'ProductOperation'] },
                { $eq: ['$type', 'entry'] }
              ]
            },
            then: '$quantity',
            else: 0,
          }
        }
      },

      allocatedForExit: {
        $sum: {
          $cond: {
            if: {
              $and: [
                { $eq: ['$kind', 'ProductAllocation'] },
                { $eq: ['$type', 'exit'] }
              ]
            },
            then: '$quantity',
            else: 0,
          }
        }
      },

      allocatedForEntry: {
        $sum: {
          $cond: {
            if: {
              $and: [
                { $eq: ['$kind', 'ProductAllocation'] },
                { $eq: ['$type', 'entry'] }
              ]
            },
            then: '$quantity',
            else: 0,
          }
        }
      },

      product: {
        $last: '$product',
      },
    });

    // // filter out productModels
    // if (options.positiveOnly) {
    //   filter.quantity = { $gt: 0 };
    // }

    // project the results to be returned as the LAST step
    aggregation.project({
      _id: 0,
      quantity: {
        $subtract: [
          {
            $sum: [
              '$entered',
              '$exited'
            ]
          },
          {
            $sum: [
              '$allocatedForEntry',
              '$allocatedForExit'
            ],
          }
        ],
      },
      inStock: {
        $sum: [
          '$entered',
          '$exited'
        ],
      },
      exited: 1,
      entered: 1,
      allocatedForExit: 1,
      allocatedForEntry: 1,
      product: 1,
    });

    // ATTENTION: this `match` operation is purposely
    // run AFTER the grouping operation, so that
    // it matches against the results from the grouping phase
    aggregation.match(filter);

    return aggregation.exec();
  };

  inventoryCtrl.shipmentSummary = function (shipment, query, filter) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }

    query = query || {};

    query['shipment._id'] = shipment._id.toString();

    return inventoryCtrl.summary(query, filter);
  };

  inventoryCtrl.productSummary = function (product, query, filter) {
    if (!product.model) { return Bluebird.reject(new errors.InvalidOption('product.model', 'required')); }
    if (!product.expiry) { return Bluebird.reject(new errors.InvalidOption('product.expiry', 'required')); }
    if (!product.measureUnit) { return Bluebird.reject(new errors.InvalidOption('product.measureUnit', 'required')); }

    query = query || {};

    query['product.model._id'] = product.model._id.toString();
    // ensure the product expiry is at the right format
    query['product.expiry'] = ProductRecord.makeProductExpiryDate(product.expiry);
    query['product.measureUnit'] = product.measureUnit;

    return inventoryCtrl.summary(query, filter).then((summary) => {

      if (summary.length === 0) {
        // the product is not in stock or has quantity.value === 0
        return {
          product: {
            model: product.model.toJSON(),
            expiry: product.expiry,
            measureUnit: product.measureUnit,
          },
          quantity: 0,
        };
      } else {
        return summary[0];
      }
    });
  };

  inventoryCtrl.availabilitySummary = function (targetDate, query, filter, sort) {

    if (!targetDate) {
      return Bluebird.reject(new errors.InvalidOption('targetDate', 'required'));
    }

    query = query || {};

    // take into account
    //   - all operations
    //   - exit allocations
    //   - entry allocations up to the targetDate
    var $or = [
      {
        kind: 'ProductOperation',
      },
      {
        kind: 'ProductAllocation',
        type: CONSTANTS.PRODUCT_RECORD_TYPES.EXIT,
      },
      {
        kind: 'ProductAllocation',
        type: CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY,
        scheduledFor: {
          $lte: targetDate,
        }
      }
    ];

    if (query.$or) {
      query.$and = [$query.$or, $or];

      delete query.$or;
    } else {
      query.$or = $or;
    }

    return inventoryCtrl.summary(query, filter, sort);
  };
  
  /**
   * Computes the amount in stock of a given
   * product and the amount allocated for exit of that same product.
   *
   * Returns the resulting sum, to be considered as the amount
   * of the given product that is still available for exit allocations.
   *
   * `product` is identified by the triad productModel-productExpiry-quantityUnit
   * 
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Date} targetDate
   * @return {Bluebird -> Number}
   */
  inventoryCtrl.productAvailability = function (product, targetDate) {
    if (!targetDate) { return Bluebird.reject(new errors.InvalidOption('targetDate', 'required')); }

    return inventoryCtrl.productSummary(product, {
      // take into account
      //   - all operations
      //   - exit allocations
      //   - entry allocations up to the targetDate
      $or: [
        {
          kind: 'ProductOperation',
        },
        {
          kind: 'ProductAllocation',
          type: CONSTANTS.PRODUCT_RECORD_TYPES.EXIT,
        },
        {
          kind: 'ProductAllocation',
          type: CONSTANTS.PRODUCT_RECORD_TYPES.ENTRY,
          scheduledFor: {
            $lte: targetDate,
          }
        }
      ],
    })
    .then((summary) => {
      return summary.quantity;
    });
  };

  /**
   * Checks whether a given quantity of the given productModel-productExpiery-quantityUnit
   * is available for allocation.
   *
   * @param  {Product} product
   *         - model
   *         - expiry
   *         - measureUnit
   * @param  {Number}  quantity
   * @param  {Date} targetDate
   * @return {Bluebird -> Boolean}
   */
  inventoryCtrl.isProductAvailable = function (product, quantity, targetDate) {

    if (!quantity || quantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'invalid'));
    }

    if (!targetDate) {
      return Bluebird.reject(new errors.InvalidOption('targetDate', 'invalid'));
    }

    return inventoryCtrl.productAvailability(
      product,
      targetDate
    )
    .then((availableUnits) => {
      if (availableUnits < quantity) {
        return false;
      } else {
        return true;
      }
    });
  };

  /**
   * Checks whether there are at least `quantity` units
   * of a given productModel at a given productExpiry and quantityUnit
   * 
   * @param  {ProductModel} productModel
   * @param  {Date}         productExpiry
   * @param  {String}       quantityUnit
   * @param  {Number}       quantity
   * @return {Bluebird -> Boolean}
   */
  inventoryCtrl.isProductInStock = function (product, quantity) {
    if (!quantity || quantity <= 0) {
      return Bluebird.reject(new errors.InvalidOption('quantity', 'required'));
    }

    // check availability of the given product model
    // with the given productExpiry and given quantity unit
    return inventoryCtrl.productSummary(product).then((summary) => {

      if (summary.quantity < quantity) {
        return false;
      } else {
        return true;
      }
    });
  };

  return inventoryCtrl;
};
