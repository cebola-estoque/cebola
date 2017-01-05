// third-party dependencies
const mongoose = require('mongoose');

// constants
const Schema = mongoose.Schema;

/**
 * @type {Schema}
 */
var organizationSchema = new Schema({
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
});

// takes the connection and options and returns the model
module.exports = function (conn, app, options) {

  if (options.schemas && options.schemas.organization) {
    options.schemas.organization(organizationSchema);
  }

  var Organization = conn.model('Organization', organizationSchema);
  
  return Organization;
};
