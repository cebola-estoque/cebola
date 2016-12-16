// third-party
const mongoose = require('mongoose');

module.exports = function mongooseObservable(schema, options) {
  
  // TODO: implement sub object schema definigion
  var observationSchemaDef = {
    title: String,
    body: String,
    author: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  };
  
  schema.add({
    observations: [],
  });

  schema.methods.addObservation = function (obs) {

    if (typeof obs === 'string') {
      obs = {
        body: obs,
      };
    }
    
    obs.createdAt = Date.now();
  
    // TODO: study why using unshift is causing errors
    // this.observations.unshift(obs);

    this.observations = [obs].concat(this.observations);
  };

};
