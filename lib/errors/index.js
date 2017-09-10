// native
const util = require('util');

function CebolaError(message) {
  Error.call(this, message);
}
util.inherits(CebolaError, Error);

/**
 * Happens when any required option is invalid
 *
 * error.option should have the option that is invalid
 * error.kind should contain details on the error type
 * 
 * @param {String} option
 * @param {String} kind
 * @param {String} message
 */
function InvalidOption(option, kind, message) {
  CebolaError.call(this, message);

  this.option = option;
  this.kind = kind;
}
util.inherits(InvalidOption, CebolaError);
InvalidOption.prototype.name = 'InvalidOption';


function ProductNotAvailable(product) {
  CebolaError.call(this, 'product not available');

  this.product = product;
}
util.inherits(ProductNotAvailable, CebolaError);
ProductNotAvailable.prototype.name = 'ProductNotAvailable';

function EmailTaken(email) {
  CebolaError.call(this, 'email ' + email + ' already in use');

  this.email = email;
}
util.inherits(EmailTaken, CebolaError);
EmailTaken.prototype.name = 'EmailTaken';

function Unauthorized() {
  CebolaError.call(this, 'unauthorized');
}
util.inherits(Unauthorized, CebolaError);
Unauthorized.prototype.name = 'Unauthorized';

function NotFound(resourceName, resourceIdentifier) {
  CebolaError.call(this, 'resource ' + resourceName + ' not found');

  this.resource = resourceName;
  this.identifier = resourceIdentifier;
}
util.inherits(NotFound, CebolaError);
NotFound.prototype.name = 'NotFound';

/**
 * Expose errors
 */
exports.CebolaError = CebolaError;
exports.InvalidOption = InvalidOption;
exports.ProductNotAvailable = ProductNotAvailable;
exports.EmailTaken = EmailTaken;
exports.Unauthorized = Unauthorized;
exports.NotFound = NotFound;
