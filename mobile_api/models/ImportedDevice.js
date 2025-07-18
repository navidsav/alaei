const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Main Device Schema
const importDeviceSchema = new Schema({

  imei: { type: String, required: true },
  serialNumber: { type: String, required: true },
  pinCode: { type: String, required: true },
  status: { type: String, required: false },
  type: { type: String, required: false },


});

// Create the Model
const import_device = mongoose.model('import_device', importDeviceSchema);

module.exports = import_device;
