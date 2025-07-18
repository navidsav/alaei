const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the CarModelDetail schema
const CarModelDetailSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()  // Auto-generate ObjectId
  },
  CarModelDetailTitle: {
    type: String,
    required: true
  }
});

// Define the CarModel schema
const CarModelSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()  // Auto-generate ObjectId
  },
  CarModelTitle: {
    type: String,
    required: true
  },
  CarModelDetails: [CarModelDetailSchema]  // Array of CarModelDetails
});

// Define the CarBrand schema
const CarBrandSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()  // Auto-generate ObjectId
  },
  BrandTitle: {
    type: String,
    required: true
  },
  CarModels: [CarModelSchema]  // Array of CarModels
});

// Create the CarBrand model
const CarBrand = mongoose.model('Carbrands', CarBrandSchema);

module.exports = CarBrand;
