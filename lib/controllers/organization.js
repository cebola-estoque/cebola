// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const Organization = cebola.models.Organization;

  var organizationCtrl = {};

  organizationCtrl.create = function (orgData) {
    var org = new Organization(orgData);

    return org.save();
  };

  organizationCtrl.delete = function (orgId) {

  };

  return organizationCtrl;
};
