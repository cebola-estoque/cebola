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
     * Indicates the type of the operation
     * 
     * @type {Object}
     */
    type: {
      type: String,
      required: true,
      validate: {
        validator: function (type) {
          return CONSTANTS.VALID_OPERATION_TYPES.indexOf(type) !== -1;
        },
        message: 'Invalid operation type `{VALUE}`'
      }
    },

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
    sourceAllocation: {
      _id: {
        type: String,
      }
    },

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
            case CONSTANTS.OPERATION_TYPES.ENTRY:
              return v > 0;
              break;
            case CONSTANTS.OPERATION_TYPES.EXIT:
              return v < 0;
              break;
            case CONSTANTS.OPERATION_TYPES.LOSS:
              return v < 0;
              break;
            case CONSTANTS.OPERATION_TYPES.CORRECTION:
              return v !== 0;
              break;
            default:
              return false;
              break;
          }
        },
        message: '{VALUE} does not match allocation type',
      }
    }

  }, {
    discriminatorKey: CONSTANTS.PRODUCT_RECORD_DISCRIMINATOR_KEY
  });

  /**
   * Statuses for operation records
   */
  operationSchema.plugin(mongooseStatus, {
    statuses: CONSTANTS.VALID_OPERATION_STATUSES,
  });

  /**
   * Associates the operation to the given shipment.
   * Sets the type of the operation to be in accordance to the shipment's type.
   * 
   * @param {Shipment} shipment
   */
  operationSchema.methods.setShipment = function (shipment) {
    this.set('shipment', {
      _id: shipment._id,
    });

    /**
     * Operation's type matches the shipment's
     */
    this.set('type', shipment.type);
  };

  /**
   * Marks the operation as associated to the given allocation.
   * Automatically associates the operation to the allocation's shipment
   * as well.
   * 
   * @param {ProductAllocation} allocation
   */
  operationSchema.methods.setSourceAllocation = function (allocation) {

    this.set('shipment', {
      _id: allocation.shipment._id,
    });
    
    this.set('type', allocation.type);

    this.set('sourceAllocation', {
      _id: allocation._id,
    });
  };

  /**
   * Freeze some properties
   */
  operationSchema.plugin(mongooseImmutable, {
    properties: [
      'type',
      'product.model._id',
      'product.expiry',
      'product.measureUnit',
    ],
  });

  // if (options.schemas && options.schemas.operation) {
  //   options.schemas.operation(operationSchema);
  // }

  var ProductOperation = ProductRecord.discriminator(
    'ProductOperation',
    operationSchema
  );

  return ProductOperation;
};
