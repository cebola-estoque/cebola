// third-party
const mongoose = require('mongoose');

module.exports = function mongooseObservable(schema, options) {
  
  var ObservationSchema = new mongoose.Schema({
    title: String,
    body: String,
    author: String,
    createdAt: Date,
  });

  schema.add({
    observations: [ObservationSchema],
  });

  schema.methods.addObservation = function (obs) {

    if (typeof obs === 'string') {
      obs = {
        body: obs,
      };
    }

    obs.createdAt = Date.now();

    this.observations.unshift(obs);
  };

};
