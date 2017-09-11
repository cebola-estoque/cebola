// third-party dependencies
const mongoose = require('mongoose');

// constants
const Schema = mongoose.Schema;

/**
 * @type {Schema}
 */
let organizationSchema = new Schema({

  number: {
    type: Number,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  roles: [String],

  addresses: {
    type: Array,
  },

  document: {
    value: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    }
  },

  contactPoint: {
    telephone: {
      type: String,
    },
    email: {
      type: String,
    },
    name: {
      type: String,
    },
  }
}, {
  timestamps: true,
});

// takes the connection and options and returns the model
module.exports = function (conn, cebola, options) {

  if (options.schemas && options.schemas.organization) {
    options.schemas.organization(organizationSchema);
  }

  /**
   * Setup autoincrement
   */
  organizationSchema.plugin(cebola._autoIncrement.plugin, {
    model: 'Organization',
    field: 'number',
    startAt: 1,
  });

  let Organization = conn.model('Organization', organizationSchema);
  
  return Organization;
};
