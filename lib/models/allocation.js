// third-party dependencies
const mongoose = require('mongoose');
const moment   = require('moment');

module.exports = function (conn, cebola, options) {

  var recordSchema = require('../schemas/record')(cebola, options);

  var Allocation = conn.model('Allocation', recordSchema);
  
  return Allocation;
};
