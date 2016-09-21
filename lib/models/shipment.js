// third-party dependencies
const mongoose = require('mongoose');

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
