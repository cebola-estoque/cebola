// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

// constants
const Schema = mongoose.Schema;

/**
 * @type {Schema}
 */
var shipmentSchema = new Schema({

  type: {
    type: String,
    required: true,
  },

  scheduledFor: {
    type: Date,
    required: true,
  },
  
  /**
   * Stores a reference to the supplier
   * organization of the shipment (if applicable)
   * @type {Organization}
   */
  supplier: {
    _id: {
      type: String,
    },

    name: {
      type: String,
    },

    document: {
      value: {
        type: String,
      },

      type: {
        type: String,
      }
    },
  },

  /**
   * Stores a reference to the recipient
   * organization of the shipment (if applicable)
   * @type {Organization}
   */
  recipient: {
    _id: {
      type: String,
    },

    name: {
      type: String,
    },

    document: {
      value: {
        type: String,
      },

      type: {
        type: String,
      }
    },
  },

  document: {
    type: Object,
  }
});

/**
 * Takes in an array of allocations and an array of operations
 * and returns a list of merged data
 * 
 * @param  {Array} allocations
 * @param  {Array} operations
 * @return {Array}
 */
shipmentSchema.statics.mergeAllocationsAndOperations = function (allocations, operations) {

  allocations = allocations.map((a) => {
    return (typeof a.toJSON === 'function') ? a.toJSON() : a;
  });
  operations = operations.map((o) => {
    return (typeof o.toJSON === 'function') ? o.toJSON() : o;
  });

  // array of operations
  // that were not allocated in any
  // of the provided allocations
  var unallocatedOperations = [];

  // for each operation, find the equivalent
  // allocation and attach it to the allocation
  // 
  // if the operation does not correspond to any allocation
  // add it to a list of 'orphan' operations
  operations.forEach((op) => {

    var alloc = allocations.find((alloc) => {
      var isSameProductModel  = alloc.productModel._id === op.productModel._id;
      var isSameProductExpiry = moment(alloc.productExpiry).isSame(op.productExpiry);
      var isSameQuantityUnit  = alloc.quantity.unit === op.quantity.unit;
      
      return (isSameProductModel && isSameProductExpiry && isSameQuantityUnit);
    });

    if (alloc) {
      alloc.operations = alloc.operations || [];
      alloc.operations.push(op);
    } else {
      unallocatedOperations.push(op);
    }

  });

  // compute allocation remaining items
  allocations.forEach((alloc) => {

    if (Array.isArray(alloc.operations)) {
      var effectivated = alloc.operations.reduce((res, op) => {
        return res + op.quantity.value;
      }, 0);

      var remainingValue = alloc.quantity.value - effectivated;

      alloc.remaining = {
        value: remainingValue,
        unit: alloc.quantity.unit,
      };
    } else {
      /**
       * No operations against this allocation
       * everything is remaining
       */

      alloc.remaining = {
        value: alloc.quantity.value,
        unit: alloc.quantity.unit,
      };
    }

  });

  return {
    allocations: allocations,
    unallocatedOperations: unallocatedOperations,
  };
};

// takes the connection and options and returns the model
module.exports = function (conn, app, options) {

  shipmentSchema.methods.setSupplier = function (supplier) {
    this.supplier = {
      _id: supplier._id.toString(),
      name: supplier.name,
      document: {
        value: supplier.document.value,
        type: supplier.document.type,
      }
    };
  }

  if (options.schemas && options.schemas.shipment) {
    options.schemas.shipment(shipmentSchema);
  }

  var Shipment = conn.model('Shipment', shipmentSchema);
  
  return Shipment;
};
