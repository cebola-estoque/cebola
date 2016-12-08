// third-party
const Bluebird = require('bluebird');

module.exports = function (cebola, options) {

  const Organization = cebola.models.Organization;

  var organizationCtrl = {};

  organizationCtrl.create = function (orgData) {
    var org = new Organization(orgData);

    return org.save();
  };
  
  organizationCtrl.getById = function (organizationId) {
    return Organization.findById(organizationId).then((organization) => {
      if (!organization) {
        return Bluebird.reject(new cebola.errors.NotFound(
          'organization',
          organizationId
        ));
      }
      
      return organization;
    });
  };

  organizationCtrl.delete = function (orgId) {

  };

  organizationCtrl.list = function (query) {
    return Organization.find(query);
  };

  return organizationCtrl;
};
