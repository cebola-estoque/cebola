// third-party
const Bluebird = require('bluebird');

const errors = require('../errors');

const CONSTANTS = require('../constants');

module.exports = function (cebola, options) {

  const ProductRecord = cebola.models.ProductRecord;
  const ProductAllocation = cebola.models.ProductAllocation;
  const ProductOperation  = cebola.models.ProductOperation;

  var inventoryCtrl = {};

  /**
   * Generic method for computing a summary over all product records
   * (both allocations and operations)
   *
   * Used by all other summary methods.
   * 
   * @param  {Object} query
   * @param  {Object} filter
   * @param  {Object} sort
   * @return {Bluebird -> Summary}
   */
  inventoryCtrl.summary = function (query, filter, sort, options) {
    options = options || {};
    
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
    
    var groupQuery = {
      _id: {
        productModelId: '$product.model._id',
        productExpiry: '$product.expiry',
        productMeasureUnit: '$product.measureUnit',
      },

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
    };
    
    if (options.keepRecords) {
      groupQuery.records = {
        $push: '$$CURRENT',
      }
    }

    aggregation.group(groupQuery);

    // project the results to be returned as the LAST step
    aggregation.project({
      _id: 0,
      quantity: {
        $sum: [
          '$entered',
          '$exited',
          '$allocatedForEntry',
          '$allocatedForExit',
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
      records: 1,
    });

    // ATTENTION: this `match` operation is purposely
    // run AFTER the grouping operation, so that
    // it matches against the results from the grouping phase
    aggregation.match(filter);

    return aggregation.exec();
  };

  /**
   * Retrieves a summary of operations and allocations
   * for the given shipment.
   * 
   * @param  {Shipment} shipment
   * @param  {Object} query
   * @param  {Object} filter
   * @param  {Object} sort
   * @return {Bluebird -> Summary}         
   */
  inventoryCtrl.shipmentSummary = function (shipment, query, filter, sort, options) {
    if (!shipment) { return Bluebird.reject(new errors.InvalidOption('shipment', 'required')); }
    
    var shipmentId = typeof shipment === 'string' ? shipment : shipment._id.toString();

    query = query || {};

    query['shipment._id'] = shipmentId;

    return inventoryCtrl.summary(query, filter, sort, options);
  };

  /**
   * Retrieves a summary of operations and allocations
   * related to the given product.
   *
   * A product is defined by the triad
   *   - model._id
   *   - expiry
   *   - measureUnit
   *   
   * @param  {Product} product
   * @param  {Object} query
   * @param  {Object} filter
   * @param  {Object} sort
   * @return {Bluebird -> Summary}  
   */
  inventoryCtrl.productSummary = function (product, query, filter, sort, options) {
    if (!product.model) { return Bluebird.reject(new errors.InvalidOption('product.model', 'required')); }
    if (!product.expiry) { return Bluebird.reject(new errors.InvalidOption('product.expiry', 'required')); }
    if (!product.measureUnit) { return Bluebird.reject(new errors.InvalidOption('product.measureUnit', 'required')); }

    query = query || {};

    query['product.model._id'] = product.model._id.toString();
    // ensure the product expiry is at the right format
    query['product.expiry'] = ProductRecord.makeProductExpiryDate(product.expiry);
    query['product.measureUnit'] = product.measureUnit;

    return inventoryCtrl.summary(query, filter, sort, options).then((summary) => {

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

  /**
   * Computes the availability of a given query
   * at a specified date.
   *
   * It is a special summary, as it takes into account the
   * date.
   *
   * TODO: study better naming and docs
   */
  inventoryCtrl.availabilitySummary = function (targetDate, query, filter, sort, options) {

    if (!(targetDate instanceof Date)) {
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

    return inventoryCtrl.summary(query, filter, sort, options);
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

      if (summary.inStock < quantity) {
        return false;
      } else {
        return true;
      }
    });
  };

  return inventoryCtrl;
};
