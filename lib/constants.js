// Object.values might come in es*
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
function _objValues(obj) {
  return Object.keys(obj).map((k) => {
    return obj[k];
  });
}

/**
 * Property used to distinguish the product record types
 * @type {String}
 */
exports.PRODUCT_RECORD_DISCRIMINATOR_KEY = 'kind';

/**
 * List of allocation statuses
 */
exports.ALLOCATION_STATUSES = {
  ACTIVE: 'allocation-active',
  CANCELLED: 'allocation-cancelled',
  FINISHED: 'allocation-finished',
};
exports.VALID_ALLOCATION_STATUSES = _objValues(exports.ALLOCATION_STATUSES);

/**
 * List of operation statuses
 */
exports.OPERATION_STATUSES = {
  ACTIVE: 'operation-active',
  CANCELLED: 'operation-cancelled',
};
exports.VALID_OPERATION_STATUSES = _objValues(exports.OPERATION_STATUSES);

/**
 * List of shipment statuses
 */
exports.SHIPMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CANCELLED: 'cancelled',
  FINISHED: 'finished',
};
exports.VALID_SHIPMENT_STATUSES = _objValues(exports.SHIPMENT_STATUSES);

/**
 * List of allocation types
 * @type {Object}
 */
exports.ALLOCATION_TYPES = {
  EXIT: 'exit',
  ENTRY: 'entry',
};
exports.VALID_ALLOCATION_TYPES = _objValues(exports.ALLOCATION_TYPES);

/**
 * List of operation types
 * @type {Object}
 */
exports.OPERATION_TYPES = {
  EXIT: 'exit',
  ENTRY: 'entry',
  LOSS: 'loss',
  CORRECTION: 'correction',
};
exports.VALID_OPERATION_TYPES = _objValues(exports.OPERATION_TYPES);

/**
 * List of organization roles
 * @type {Object}
 */
exports.ORGANIZATION_ROLES = {
  SUPPLIER: 'supplier',
  RECIPIENT: 'recipient',
};
exports.VALID_ORGANIZATION_ROLES = _objValues(exports.ORGANIZATION_ROLES);
