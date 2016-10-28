// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

const CONSTANTS = require('../../constants');

module.exports = function (ProductRecord, conn, cebola, options) {

  /**
   * Schema applied to product-records of kind `operation`
   */
  var operationSchema = new mongoose.Schema({

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
  }, {
    discriminatorKey: CONSTANTS.PRODUCT_RECORD_DISCRIMINATOR_KEY
  });

  operationSchema.methods.setShipment = function (shipment) {
    this.set('shipment', {
      _id: shipment._id,
    });

    /**
     * Allocation's type matches the shipment's
     */
    this.set('type', shipment.type);
  };

  // if (options.schemas && options.schemas.operation) {
  //   options.schemas.operation(operationSchema);
  // }


  var ProductOperation = ProductRecord.discriminator(
    'ProductOperation',
    operationSchema
  );

  return ProductOperation;
};
