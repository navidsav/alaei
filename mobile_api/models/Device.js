const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Location Schema
const locationSchema = new Schema({
  time: { type: Date, required: true },
  lat: { type: Number, required: true },
  long: { type: Number, required: true }
});

// Define the Status Schema
const statusSchema = new Schema({
  time: { type: Date, required: true },
  batteryLevel: { type: Number, required: true }
});

// Define the Message Schema
const messageSchema = new Schema({
  time: { type: Date, required: true },
  type: { type: String, required: true, enum: ['command', 'notification'] },
  command: { type: String },
  message: { type: String }
});

// Define the Main Device Schema
const deviceSchema = new Schema({
  imei: { type: String, required: true },
  date: { type: Date, required: true },
  locations: [locationSchema],  // Array of location objects
  status: [statusSchema],  // Array of status objects
  messages: [messageSchema]  // Array of message objects
});

// Create the Model
const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
