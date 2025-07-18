




const express = require("express");
const User = require("../models/User");
const CarModel = require("../models/CarModel");
const authMiddleware = require("../middleware/auth");
const responseHandler = require("./response_handler");
const CarBrand = require("../models/CarModel");
const import_device = require("../models/ImportedDevice");
const mongoose = require('mongoose');
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");


const logger = require("../../common/logger")

const config = require("../../config.json");


let db = {};


const router = express.Router();






// router.get("/get-car", authMiddleware, async (req, res) => {
//   const { imei } = req.query;  // Get the imei from the query string

//   try {
//     // Find the authenticated user
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Find the car with the provided IMEI
//     const car = user.registeredCars.find(car => car.deviceInfo.imei === imei);
//     if (!car) return res.status(404).json({ message: "Car not found" });

//     // Respond with the car details
//     res.json(car);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// });



// router.post("/update-device-info", authMiddleware, async (req, res) => {
//   const { oldImei, deviceInfo } = req.body;

//   try {
//     // Find the authenticated user
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Check if the new IMEI is unique across all users
//     const existingCar = await User.findOne({ "registeredCars.deviceInfo.imei": deviceInfo.imei });
//     if (existingCar) {
//       return res.status(400).json({ message: "Car with this IMEI is already registered by another user" });
//     }

//     // Find the car with the old IMEI
//     const car = user.registeredCars.find(car => car.deviceInfo.imei === oldImei);
//     if (!car) {
//       return res.status(404).json({ message: "Car with the provided old IMEI not found" });
//     }

//     // Update the car's deviceInfo with the new IMEI
//     car.deviceInfo = { ...car.deviceInfo, ...deviceInfo };

//     // Save the updated user
//     await user.save();

//     res.json({ message: "Device info updated successfully", updatedCar: car });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// router.post("/register-car", authMiddleware, async (req, res) => {
//   try {
//     const { status, deviceInfo } = req.body;

//     // Find the authenticated user
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Check if any user has already registered a car with the same IMEI
//     const existingCar = await User.findOne({ "registeredCars.deviceInfo.imei": deviceInfo.imei });
//     if (existingCar) {
//       return res.status(400).json({ message: "Car with this IMEI is already registered by another user" });
//     }

//     // Add the new car to registeredCars array
//     user.registeredCars.push({ status, deviceInfo, carInfo: null });

//     // Save updated user
//     await user.save();

//     res.status(201).json({ message: "Car registered successfully", registeredCars: user.registeredCars });
//   } catch (error) {
//     console.log(error)
//     res.status(500).json({ message: "Server error" });
//   }
// });


router.get("/getall", async (req, res) => {

  try {


    const carsList = await db.aggregate("users", [
      {
        $match: {
          "_id": new mongodb.ObjectId(req.user.id)
        },
      },
      {
        $lookup: {
          from: "carbrands",
          localField: "registeredCars.carInfo.carModelId",
          foreignField: "CarModels.CarModelDetails._id",
          as: "carBrands"
        },
      },
      {
        $lookup: {
          from: "colors",
          localField: "registeredCars.carInfo.carColorId",
          foreignField: "_id",
          as: "carColors"
        },
      },
      {
        $lookup: {
          from: "import_devices",
          localField: "registeredCars.deviceInfo.imei",
          foreignField: "imei",
          as: "carDevices"
        },
      },
      {
        $project: {
          "registeredCars.deviceInfo.devicePinCode": 0,
          "carDevices.pinCode": 0
        }
      }

    ]);



    let userCars = [];
    if (carsList.length > 0) {



      for (let i = 0; i < carsList[0].registeredCars.length; ++i) {
        let car = carsList[0].registeredCars[i];
        let carBrand = {};
        let carModel = {};
        let carModelDetail = {};

        let readyBrand = carsList[0].carBrands.find(brand => brand.CarModels.findIndex(model => model.CarModelDetails.findIndex(det => det._id.toString() == car.carInfo.carModelId.toString()) >= 0) >= 0);

        if (readyBrand) {
          readyBrand.CarModels.forEach(model => {
            model.CarModelDetails.forEach(modelDetail => {
              if (modelDetail._id.toString() == car.carInfo.carModelId.toString()) {
                carBrand = { ...readyBrand };
                carModel = { ...model };
                carModelDetail = modelDetail;

              }
            })
          });
          let yy = delete carBrand['CarModels'];
          yy = delete carModel['CarModelDetails'];
        }
        let color = {};
        if (carsList[0].carColors.length > 0) {
          color = carsList[0].carColors.find(color => color._id.toString() == car.carInfo.carColorId.toString());
        }
        let device = {};
        if (carsList[0].carDevices.length > 0) {
          device = carsList[0].carDevices.find(dev => dev.imei == car.deviceInfo.imei);
        }



        userCars.push({
          "carId": car._id,
          "CarId": car._id,
          "car_id": car._id,
          "car": car,
          "brand": carBrand,
          "model": carModel,
          "modelDetail": carModelDetail,
          "color": color,
          "device": device
        });
      }



    }



    return responseHandler.okResponse(res, "Here you are!", userCars)

  } catch (error) {
    console.error(error)
    return responseHandler.errorResponse(res, "Server error", {})
  }

});

router.get("/getbrands", async (req, res) => {
  try {
    const list = await CarBrand.aggregate([
      // {
      //   $lookup: {
      //     from: "carbrands",
      //     localField: "registeredCars.carInfo.carModelId",
      //     foreignField: "CarModels.CarModelDetails._id",
      //     as: "cars"
      //   },
      // },
      {
        $project: {
          "BrandTitle": 1,
          "_id": 1
        }
      }
    ]);

    return responseHandler.okResponse(res, "Here you are!", list)

  } catch (error) {
    console.error(error)
    return responseHandler.errorResponse(res, "Server error", {})
  }


});

router.post("/GetCarModelByBrandId", async (req, res) => {
  console.log('GetCarModelByBrandId')
  try {
    const { BrandId } = req.body;
    selectedBrand = await CarModel.findOne({ "_id": BrandId })
    if (!selectedBrand) {
      return responseHandler.nokResponse(res, "Brand not found", {});
    }
    const carModels = selectedBrand.CarModels.map(model => ({
      _id: model._id,
      CarModelTitle: model.CarModelTitle
    }));
    console.log(carModels)

    return responseHandler.okResponse(res, "Here you are!", carModels)



  } catch (error) {
    console.error(error)
    return responseHandler.errorResponse(res, "Server error", {})

  }
});


router.post("/GetcarModelDetailByCarModelId", async (req, res) => {
  try {
    // const { BrandId, CarModelId } = req.body;
    const { CarModelId } = req.body;

    // Find the brand by BrandId
    // const selectedBrand = await CarModel.findOne({ _id: BrandId });

    // if (!selectedBrand) {
    //     return res.status(404).json({ message: "Brand not found" });
    // }

    // Find the specific car model within CarModels array
    // const filteredCarModel = selectedBrand.CarModels
    //     .filter(model => model._id.toString() === CarModelId)  // Convert to string for comparison


    var id = new mongoose.Types.ObjectId(CarModelId);


    let carModelDetails = await CarBrand.aggregate(
      [
        {
          $match: {
            "CarModels._id": id
          }
        },
        {
          $unwind:
          /**
           * path: Path to the array field.
           * includeArrayIndex: Optional name for index.
           * preserveNullAndEmptyArrays: Optional
           *   toggle to unwind null and empty values.
           */
          {
            path: "$CarModels"
          }
        },
        {
          $match: {
            "CarModels._id": id
          }
        },
        {
          $project:
          /**
           * specifications: The fields to
           *   include or exclude.
           */
          {
            "CarModels.CarModelDetails": 1
          }
        },
        {
          $group:
          /**
           * _id: The id of the group.
           * fieldN: The first field name.
           */
          {
            _id: "$CarModels.CarModelDetails"
          }
        }
      ]
    )

    return responseHandler.okResponse(res, "", carModelDetails);

  } catch (error) {
    logger.error({ event: "Error GetcarModelDetailByCarModelId", error: error.message })
    return responseHandler.errorResponse(res, "Server error", {})

  }
});


// Register device
router.post("/RegisterDevice", authMiddleware, async (req, res) => {
  try {
    const { Device, Car } = req.body;

    if (!Device || !Device.SerialNumber || !Device.Password) {
      // return res.status(400).json({ message: "Device information is required" });
      return responseHandler.nokResponse(res, "اطلاعات دستگاه ناقصه ", Device);
    }

    if (!Car || !Car.Tip || !Car.ColorId) {
      // return res.status(400).json({ message: "Device information is required" });
      return responseHandler.nokResponse(res, "اطلاعات خودرو رو تکمیل کن لطفا", Device);
    }


    // Find the authenticated user
    const user = await User.findById(req.user.id);
    if (!user)
      responseHandler.nokResponse(res, "Login first please!", {});

    // Check if the device IMEI is already registered under any user
    const existingDevice = await User.findOne({ "registeredCars.deviceInfo.deviceSerialNumber": Device.SerialNumber });
    if (existingDevice) {
      return responseHandler.nokResponse(res, "Device with this IMEI is already registered by another user", Device)
      // return res.status(400).json({ message: "Device with this IMEI is already registered by another user" });
    }

    let deviceRef = await import_device.findOne({ "serialNumber": Device.SerialNumber });
    if (!deviceRef)
      return responseHandler.nokResponse(res, "Device is not available!", {});

    // Register the new device and car for the user
    user.registeredCars.push({
      status: "complete",
      deviceInfo: {
        "deviceSerialNumber": deviceRef.serialNumber.trim(),
        "devicePinCode": deviceRef.pinCode,
        "imei": deviceRef.imei,
        "simNumber": Device.SimNumber,
      }, carInfo: {
        "numberPlate": Car.Pelak,
        "carModelId": Car.Tip,
        "carColorId": Car.ColorId,
        "mileage": Device.Distance,
      }, bmiInfo: {
        "bmiSerialNumber": Device.EncoderSerialNumber.toString().trim(),
        "bmiVersion": Device.EncoderSerialNumber.indexOf(".") > 0 ? 2 : 1
      }, checklist_milage: {
        "engine_oil": 0,
        "timing_belt": 0,
        "air_filter": 0,
        "transmission_fluid": 0,
        "tire": 0,
        "spark_plug": 0,
        "coolant": 0,
      }
    });

    // Save updated user
    await user.save();

    return responseHandler.okResponse(res, "Successfully registered!", {})

    // res.status(201).json({ message: "Device registered successfully", registeredCars: user.registeredCars });
  } catch (error) {
    logger.error({ event: " HTTP POST RegisterDevice ERROR", error: error?.message });
    return responseHandler.errorResponse(res, "Server error", error)
  }
});

router.post("/DeleteCars", authMiddleware, async (req, res) => {
  try {

    const { CarId, PinCode } = req.body;


    // Check if the user exists 
    const user = await User.findById(req.user.id);

    if (user) {

      const result = await User.updateOne(
        { _id: req.user.id, "registeredCars._id": new mongoose.Types.ObjectId(CarId) },
        { $pull: { "registeredCars": { "deviceInfo.devicePinCode": PinCode } } });

      console.log('Car removed:', result);

      await user.save();
      return responseHandler.okResponse(res, "Successfully deleted!", result);


    }
    else {
      return responseHandler.nokResponse(res, "Login first please!", {});
    }



  } catch (error) {
    logger.error({ event: " HTTP POST DeleteCars ERROR", error: error?.message });
    return responseHandler.errorResponse(res, "Server error", error)
  }
});


router.post("/EditCarInfo", authMiddleware, async (req, res) => {
  const {
    CarId,
    Tip,
    Pelak,
    ColorId,
    Distance,
    EncoderSerialNumber } = req.body;

  try {


    db.update('users', {
      _id: new mongodb.ObjectId(req.user.id),
      "registeredCars._id": new mongodb.ObjectId(CarId)
    }, {
      $set: {
        "registeredCars.$.carInfo.numberPlate": Pelak,
        "registeredCars.$.carInfo.carColorId": new mongodb.ObjectId(ColorId),
        "registeredCars.$.carInfo.carModelId": new mongodb.ObjectId(Tip),
        "registeredCars.$.carInfo.mileage": Distance,
        "registeredCars.$.bmiInfo.bmiSerialNumber": EncoderSerialNumber.toString().trim(),
        "registeredCars.$.bmiInfo.bmiVersion": EncoderSerialNumber.indexOf(".") > 0 ? 2 : 1

      }
    }, {
      upsert: false
    })
      .then((r) => {
        logger.debug({ message: "Car info updated successfully", reqbody: req.body });

        return responseHandler.okResponse(res, "Car info updated successfully", {})

      })
      .catch((e) => {
        logger.error({ event: "Error in update Car info ", reqbody: req.body, error: e?.message });
        return responseHandler.errorResponse(res, "Error in update Car info", req.body)

      });




  } catch (error) {

    logger.error({ event: "Server Error in update Car info ", reqbody: req.body, error: error?.message });

    return responseHandler.errorResponse(res, "Server error", req.body);

  }
});


mongo(config.DB_URI, config.MOBILE_DB_NAME)
  .then(async (DB) => {
    db = DB;



  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message })

  });



module.exports = router;
