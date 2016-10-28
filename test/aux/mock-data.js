// third-party
const moment = require('moment');

exports.productModels = [
  {
    _id: 'product-model-1',
    description: 'Product model 1'
  },
  {
    _id: 'product-model-2',
    description: 'Product model 2'
  },
  {
    _id: 'product-model-3',
    description: 'Product model 4'
  },
  {
    _id: 'product-model-4',
    description: 'Product model 4'
  },
];

exports.organizations = [
  {
    _id: 'supplier-1',
    name: 'Supplier` 1',
    roles: ['supplier'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-81',
    }
  },
  {
    _id: 'supplier-2',
    name: 'Supplier 2',
    roles: ['supplier'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-82',
    }
  },
  {
    _id: 'receiver-1',
    name: 'Receiver 1',
    roles: ['Receiver'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-83',
    }
  },
  {
    _id: 'receiver-2',
    name: 'Receiver 2',
    roles: ['Receiver'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-84',
    }
  },
];

exports.suppliers = exports.organizations.slice(0, 2);
exports.receivers = exports.organizations.slice(2, 4);

exports.shipments = [
  {
    _id: 'entry-1',
    type: 'entry',
    supplier: exports.suppliers[0],
    scheduledFor: moment().add(1, 'day').toDate(),
  },
  {
    _id: 'entry-2',
    type: 'entry',
    supplier: exports.suppliers[0],
    scheduledFor: moment().add(3, 'day').toDate(),
  },
  {
    _id: 'exit-1',
    type: 'exit',
    receiver: exports.receivers[0],
    scheduledFor: moment().add(1, 'day').toDate(),
  },
  {
    _id: 'exit-2',
    type: 'exit',
    receiver: exports.receivers[0],
    scheduledFor: moment().add(3, 'day').toDate(),
  }
];

exports.entryShipments = exports.shipments.slice(0, 2);
exports.exitShipments  = exports.shipments.slice(2, 4);
