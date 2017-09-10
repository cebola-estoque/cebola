// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');
const mongooseStatus = require('mongoose-make-status');

const mongooseImmutable = require('../../lib/mongoose-immutable');

const CONSTANTS = require('../../constants');

module.exports = function (ProductRecord, conn, cebola, options) {

  /**
   * Schema applied to product-records of kind `operation`
   */
  var operationSchema = new mongoose.Schema({

    /**
     * Identifies the allocation this operation
     * was originated from.
     *
     * Will only be set if the operation is of type 'entry' or 'exit'
     * 'loss' and 'correction' operations have no associated sourceAllocations
     * nor shipments.
     * 
     * @type {Object}
     */
    // sourceAllocation: {
    //   _id: {
    //     type: String,
    //   }
    // },

    /**
     * Reference to the shipment this operation
     * is associated to.
     *
     * Operations are not necessarily associated to shipments.
     * 
     * @type {Object}
     */
    shipment: {
      _id: {
        type: String,
      },
    },

    quantity: {
      type: Number,
      validate: {
        validator: function (v) {
          var type = this.get('type');

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
     * Indicates the category of operation
     * 
     * @type {Object}
     */
    category: {
      type: String,
      validate: {
        validator: function (category) {
          return CONSTANTS.VALID_OPERATION_CATEGORIES.indexOf(category) !== -1;
        },
        message: 'Invalid operation category `{VALUE}`',
      },
      default: CONSTANTS.OPERATION_CATEGORIES.NORMAL,
    },


  }, {
    discriminatorKey: CONSTANTS.PRODUCT_RECORD_DISCRIMINATOR_KEY
  });

  /**
   * Statuses for operation records
   */
  operationSchema.plugin(mongooseStatus, {
    statuses: CONSTANTS.VALID_OPERATION_STATUSES,
  });
  
  // /**
  //  * Marks the operation as associated to the given allocation.
  //  * Automatically associates the operation to the allocation's shipment
  //  * as well.
  //  * 
  //  * @param {ProductAllocation} allocation
  //  */
  // operationSchema.methods.setSourceAllocation = function (allocation) {

  //   this.set('shipment', {
  //     _id: allocation.shipment._id,
  //   });
    
  //   this.set('type', allocation.type);

  //   this.set('sourceAllocation', {
  //     _id: allocation._id,
  //   });
  // };
  
  /**
   * Freeze some properties
   */
  operationSchema.plugin(mongooseImmutable, {
    properties: [
      'type',
      'product.model._id',
      'product.expiry',
      'product.measureUnit',
      'product.sourceShipment._id',
    ],
  });

  /**
   * Mixin
   */
  if (options.schemas && options.schemas.operation) {
    options.schemas.operation(operationSchema);
  }

  var ProductOperation = ProductRecord.discriminator(
    'ProductOperation',
    operationSchema
  );

  return ProductOperation;
};
