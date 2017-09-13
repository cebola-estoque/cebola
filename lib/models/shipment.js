// third-party dependencies
const mongoose       = require('mongoose');
const moment         = require('moment');
const mongooseStatus = require('mongoose-make-status');

const mongooseHistory    = require('../lib/mongoose-history');
const mongooseImmutable  = require('../lib/mongoose-immutable');

// constants
const Schema = mongoose.Schema;
const CONSTANTS = require('../constants');

/**
 * @type {Schema}
 */
let shipmentSchema = new Schema({

  number: {
    type: Number,
    required: true,
    unique: true,
  },

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
      type: mongoose.Schema.Types.ObjectId,
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

    contactPoint: {
      name: {
        type: String,
      },

      telephone: {
        type: String,
      },

      email: {
        type: String,
      }
    }
  },

  /**
   * Stores a reference to the recipient
   * organization of the shipment (if applicable)
   * @type {Organization}
   */
  recipient: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
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

    contactPoint: {
      name: {
        type: String,
      },

      telephone: {
        type: String,
      },

      email: {
        type: String,
      }
    }
  },

}, {
  timestamps: true
});

shipmentSchema.plugin(mongooseStatus, {
  statuses: CONSTANTS.VALID_SHIPMENT_STATUSES
});

shipmentSchema.plugin(mongooseImmutable, {
  properties: [
    'type',
  ]
});

// takes the connection and options and returns the model
module.exports = function (conn, cebola, options) {

  shipmentSchema.methods.setSupplier = function (supplier) {
    this.supplier = {
      _id: supplier._id,
      name: supplier.name,
      document: {
        value: supplier.document.value,
        type: supplier.document.type,
      },
    };

    if (supplier.contactPoint) {
      this.supplier.contactPoint = {
        name: supplier.contactPoint.name,
        telephone: supplier.contactPoint.telephone,
        email: supplier.contactPoint.email,
      };
    }

  };

  shipmentSchema.methods.setRecipient = function (recipient) {
    this.recipient = {
      _id: recipient._id,
      name: recipient.name,
      document: {
        value: recipient.document.value,
        type: recipient.document.type,
      },
    };

    if (recipient.contactPoint) {
      this.recipient.contactPoint = {
        name: recipient.contactPoint.name,
        telephone: recipient.contactPoint.telephone,
        email: recipient.contactPoint.email,
      };
    }
  };

  if (options.schemas && options.schemas.shipment) {
    options.schemas.shipment(shipmentSchema);
  }

  /**
   * Setup autoincrement
   */
  shipmentSchema.plugin(cebola._autoIncrement.plugin, {
    model: 'Shipment',
    field: 'number',
    startAt: 1,
  });

  let Shipment = conn.model('Shipment', shipmentSchema);
  
  return Shipment;
};
