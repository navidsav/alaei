const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String },
  phoneNumber: { type: String, required: true, unique: true },
  verificationCode: { type: Number },
  verificationDate: { type: Date },
  status: { type: String },
  salt: { type: String },
  password: { type: String },
  registeredCars: [
    {
      status: { type: String, required: true, enum: ["complete", "pending"] },
     
      carInfo: {
        numberPlate: { type: String },
        carModelId: Schema.Types.ObjectId,
        carColorId: Schema.Types.ObjectId,
        mileage: { type: Number }
      },
   


    },
  ],
  userMessages: [
    {
      time: { type: Date, required: true },
      message: { type: String, required: true },
      from: { type: String, required: true, enum: ["support", "user"] },
    },
  ],
  pushNotificationTokens: [
    {
      type: { type: String, required: true },
      tokenId: { type: String, required: true },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);