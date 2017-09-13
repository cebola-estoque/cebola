// third-party
const moment = require('moment');
const mongoose = require('mongoose');
const objectPath = require('object-path');

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

/**
 * Loads a reference into an object
 * 
 * @param  {Object} object
 * @param  {String} referencePath The path at which the reference is
 * @param  {Model} model The model from where the reference should be loaded from
 * @return {Bluebird -> Array}
 */
exports.populateReference = function (objects, referencePath, model) {
  if (!objects) {
    throw new Error('objects is required');
  }
  if (!referencePath) {
    throw new Error('referencePath is required');
  }
  if (!model) {
    throw new Error('model is required');
  }

  let isInputArray = Array.isArray(objects);

  objects = isInputArray ? objects : [objects];

  // ensure objects are plain objects
  objects = objects.map((obj) => {
    return obj instanceof mongoose.Model ? obj.toJSON() : obj;
  })

  let referenceIds = objects.map((object) => {
    let refValue = objectPath.get(object, referencePath);

    return refValue && refValue._id ?
      refValue._id : null;
  });

  let validReferenceIds = referenceIds.filter((candidateId, index, self) => {
    if (!candidateId) {
      return false;
    }

    // remove duplicates
    return self.findIndex((_id) => {
      return _id.toString() === candidateId.toString();
    }) === index;
  });

  if (validReferenceIds.length === 0) {
    // no valid references to be populated
    return Bluebird.resolve(objects);
  }

  let query = {
    _id: validReferenceIds,
  };

  return model.find(query).then((results) => {

    referenceIds.forEach((refId, index) => {
      let correspondingResult = results.find((result) => {
        return result._id.toString() === refId.toString();
      });

      if (correspondingResult) {
        objectPath.set(objects[index], referencePath, correspondingResult.toJSON());
      }
    });

    return isInputArray ? objects : objects[0];
  });
};