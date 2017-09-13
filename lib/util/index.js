// third-party
const moment = require('moment');
const mongoose = require('mongoose');

/**
 * Function that standardizes the expiration date
 * @param  {Date|undefined} date
 * @return {Date|undefined}     
 */
exports.normalizeExpiryDate = function (date) {
  return date instanceof Date || typeof date === 'string' ?
    moment(date).endOf('day').toDate() : undefined;
};

/**
 * Function that standardizes the measure unit
 * @param  {String|undefined} measureUnit
 * @return {String|undefined}     
 */
 exports.normalizeMeasureUnit = function (measureUnit) {
  return typeof measureUnit === 'string' ?
    measureUnit.toUpperCase() : undefined;
};

exports.normalizeObjectId = function (id) {
  return id instanceof mongoose.Schema.Types.ObjectId ?
    id : mongoose.Types.ObjectId(id);
};

/**
 * Helper function that checks whether two products are the same.
 * 
 * @param  {Product}  productA
 * @param  {Product}  productB
 * @return {Boolean}
 */
exports.isSameProduct = function (productA, productB) {
  let isSameModel = productA.model._id.toString() === productB.model._id.toString();
  let isSameExpiry = moment(productA.expiry).isSame(productB.expiry);
  let isSameMeasureUnit = productA.measureUnit === productB.measureUnit;
  let isSameSourceShipment = productA.sourceShipment._id.toString() ===
                             productB.sourceShipment._id.toString();
  
  return isSameModel &&
         isSameExpiry &&
         isSameMeasureUnit &&
         isSameSourceShipment;
};
