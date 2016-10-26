// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

const CONSTANTS = require('../constants');

module.exports = function (conn, cebola, options) {

  var operationSchema = require('../schemas/record')(cebola, options);

  operationSchema.add({

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
  })

  operationSchema.methods.setShipment = function (shipment) {
    this.set('shipment', {
      _id: shipment._id,
    });

    /**
     * Allocation's type matches the shipment's
     */
    this.set('type', shipment.type);
  };

  if (options.schemas && options.schemas.operation) {
    options.schemas.operation(operationSchema);
  }

  var Operation = conn.model('Operation', operationSchema);
  
  return Operation;
};
