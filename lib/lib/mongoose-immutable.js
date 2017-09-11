module.exports = function mongooseImmutable(schema, options) {
  const PROPERTIES = options.properties;

  if (!Array.isArray(PROPERTIES) || PROPERTIES.length === 0) {
    throw new Error('options.properties is required');
  }

  schema.pre('validate', function (next) {

    if (this.isNew) {
      // new documents do not follow immutable rules
      next();
      return;
    }

    let immutablePropModified = PROPERTIES.some((prop) => {
      return this.isModified(prop);
    });

    if (immutablePropModified) {
      next(new Error('immutable property modified'));
    } else {
      next();
    }
  });

};
