'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
require('../src/models/User.model');
require('../src/models/Criminal.model');
const User = mongoose.model('User');
const Criminal = mongoose.model('Criminal');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dial112';

mongoose.connect(MONGO_URI).then(async () => {
  const officers = await User.find({ role: 'police' }).limit(20).select('_id name');
  const criminals = await Criminal.find().limit(30).select('_id name');
  const admin = await User.findOne({ role: 'admin' }).select('_id name');
  const reporters = await User.find({ role: { $in: ['police', 'admin'] } }).limit(10).select('_id name');
  console.log('OFFICERS:', JSON.stringify(officers.map(o => ({ id: o._id.toString(), name: o.name }))));
  console.log('CRIMINALS:', JSON.stringify(criminals.map(c => ({ id: c._id.toString(), name: c.name }))));
  console.log('ADMIN:', JSON.stringify(admin ? { id: admin._id.toString(), name: admin.name } : null));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
