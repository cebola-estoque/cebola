module.exports = function makeHistory(schema, options) {

  const HISTORY_PROP = 'history';
  const CREATED_AT   = 'createdAt';
  const UPDATED_AT   = 'updatedAt';

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

    if (this.isModified()) {
      // copy the whole object and save it to the history
      var version = this.toJSON();

      this[HISTORY_PROP].push(version);

      this.set(UPDATED_AT, Date.now());
    }

    next();
  });

};
