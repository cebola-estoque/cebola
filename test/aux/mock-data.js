// third-party
const moment = require('moment');
const mongoose = require('mongoose');

exports.productModels = [
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 1,
    description: 'Product model 1'
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 2,
    description: 'Product model 2'
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 3,
    description: 'Product model 4'
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 4,
    description: 'Product model 4'
  },
];

exports.organizations = [
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 1,
    name: 'Supplier` 1',
    roles: ['supplier'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-81',
    }
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 2,
    name: 'Supplier 2',
    roles: ['supplier'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-82',
    }
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 3,
    name: 'Receiver 1',
    roles: ['Receiver'],
    document: {
      type: 'CNPJ',
      value: '87.023.556/0001-83',
    }
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 4,
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
    _id: mongoose.Types.ObjectId().toString(),
    number: 1,
    type: 'entry',
    supplier: exports.suppliers[0],
    scheduledFor: moment().add(1, 'day').toDate(),
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 2,
    type: 'entry',
    supplier: exports.suppliers[0],
    scheduledFor: moment().add(3, 'day').toDate(),
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 3,
    type: 'exit',
    receiver: exports.receivers[0],
    scheduledFor: moment().add(1, 'day').toDate(),
  },
  {
    _id: mongoose.Types.ObjectId().toString(),
    number: 4,
    type: 'exit',
    receiver: exports.receivers[0],
    scheduledFor: moment().add(3, 'day').toDate(),
  }
];

exports.entryShipments = exports.shipments.slice(0, 2);
exports.exitShipments  = exports.shipments.slice(2, 4);
