// native
const util = require('util');

function CebolaError() {

}
util.inherits(CebolaError, Error);

exports.CebolaError = CebolaError;
