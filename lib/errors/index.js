// native
const util = require('util');

function CebolaError(message) {
  Error.call(this, message);
}
util.inherits(CebolaError, Error);

exports.CebolaError = CebolaError;
