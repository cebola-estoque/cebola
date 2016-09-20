// Object.values might come in es*
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
function _objValues(obj) {
  return Object.keys(obj).map((k) => {
    return obj[k];
  });
}

/**
 * List of allocation statuses
 * @type {Object}
 */
exports.ALLOCATION_STATUSES = {

};
exports.VALID_ALLOCATION_STATUSES = _objValues(exports.ALLOCATION_STATUSES);

exports.ALLOCATION_TYPES = {

};
exports.VALID_ALLOCATION_TYPES = _objValues(exports.ALLOCATION_TYPES);

/**
 * List of operation statuses
 * @type {Object}
 */
exports.OPERATION_STATUSES = {

};
exports.VALID_OPERATION_STATUSES = _objValues(exports.OPERATION_STATUSES);

exports.OPERATION_TYPES = {

};
exports.VALID_OPERATION_TYPES = _objValues(exports.OPERATION_TYPES);

exports.ORGANIZATION_ROLES = {
  SUPPLIER: 'supplier',

};
exports.VALID_ORGANIZATION_ROLES = _objValues(exports.ORGANIZATION_ROLES);
