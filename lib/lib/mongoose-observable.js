module.exports = function makeHistory(schema, options) {

  schema.add({
    observations: [{
      title: String,
      body: String,
      author: String,
      createdAt: Date,
    }],
  });

  schema.methods.addObservation = function (obs) {

    if (typeof obs === 'string') {
      obs = {
        body: obs,
      };
    }

    obs.createdAt = Date.now();

    this.observations.push(obs);
  };

};
