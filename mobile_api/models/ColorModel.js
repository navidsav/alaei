const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the CarModelDetail schema
const ColorSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()  
  },
  colorName: {
    type: String,
    required: true
  }
});


const Colors = mongoose.model('colors', ColorSchema);

module.exports = Colors;