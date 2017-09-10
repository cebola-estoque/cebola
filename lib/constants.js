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
 * List of record statuses
 */
exports.PRODUCT_RECORD_TYPES = {
  EXIT: 'exit',
  ENTRY: 'entry',
};
exports.VALID_PRODUCT_RECORD_TYPES = _objValues(exports.PRODUCT_RECORD_TYPES);

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
  IN_PROGRESS: 'in-progress',
  CANCELLED: 'cancelled',
  FINISHED: 'finished',
};
exports.VALID_SHIPMENT_STATUSES = _objValues(exports.SHIPMENT_STATUSES);

/**
 * List of operation types
 * @type {Object}
 */
exports.OPERATION_CATEGORIES = {
  LOSS: 'loss',
  CORRECTION: 'correction',
  NORMAL: 'normal',
};
exports.VALID_OPERATION_CATEGORIES = _objValues(exports.OPERATION_CATEGORIES);

/**
 * List of organization roles
 * @type {Object}
 */
exports.ORGANIZATION_ROLES = {
  SUPPLIER: 'supplier',
  RECIPIENT: 'recipient',
};
exports.VALID_ORGANIZATION_ROLES = _objValues(exports.ORGANIZATION_ROLES);
