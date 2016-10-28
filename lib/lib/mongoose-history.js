module.exports = function mognooseHistory(schema, options) {

  const HISTORY_PROP = options.historyProp   || 'history';
  const CREATED_AT   = options.createdAtProp || 'createdAt';
  const UPDATED_AT   = options.updatedAtProp || 'updatedAt';

  const PROPERTIES = options.properties;

  if (!Array.isArray(PROPERTIES) || PROPERTIES.length === 0) {
    throw new Error('options.properties is required');
  }

  var schemaDef = {};
  schemaDef[HISTORY_PROP] = [];

  schemaDef[CREATED_AT] = {
    type: Date,
    default: Date.now
  };

  schemaDef[UPDATED_AT] = {
    type: Date,
    default: Date.now,
  };

  schema.add(schemaDef);

  schema.pre('save', function (next) {

    var trackPropModified = PROPERTIES.some((prop) => {
      return this.isModified(prop);
    });

    if (trackPropModified) {
      // copy the whole object and save it to the history
      // TODO: improve
      var version = PROPERTIES.reduce((v, prop) => {

        if (this.isModified(prop)) {
          v[prop] = this[prop];
        }

        return v;
      }, {});

      this[HISTORY_PROP].unshift(version);

      this.set(UPDATED_AT, Date.now());
    }

    next();
  });

};
