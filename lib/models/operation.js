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

    quantity: {
      value: {
        type: Number,
        required: true,
        validate: {
          type: 'QuantityAndOperationTypeMismatch',
          validator: function (quantityValue) {
            var type = this.get('type');

            if (type === CONSTANTS.OPERATION_TYPES.ENTRY) {
              return quantityValue > 0;
            } else if (type === CONSTANTS.OPERATION_TYPES.EXIT ||
                       type === CONSTANTS.OPERATION_TYPES.LOSS) {
              return quantityValue < 0;
            }
          },
          message: 'quantity.value MUST be positive for type `entry` and negative for type `exit`'
        }
      },
      unit: {
        type: String,
        required: true,
      },
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

  var Operation = conn.model('Operation', operationSchema);
  
  return Operation;
};
