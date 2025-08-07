
const express = require("express");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const responseHandler = require("./response_handler");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const cities = require("../../common/admin/city")
const roles = require("../../common/admin/role")


const logger = require("../../common/logger")
const config = require("../../config.json");
let db = {};

const router = express.Router();

const generateCode = require("../../common/code_generator")



// ############################################
// ############################################
// ############################################

router.post("/generateReferralCode", async (req, res) => {

  const { city, agencyCode, role } = req.body;

  // در لحظه ساخت یک فرد جدید


  let update = await db.update('referral_code_counter',
    { year: new Date().getFullYear(), city: city, agencyCode: agencyCode },
    { $inc: { count: 1 } },
    {
      upsert: true, returnDocument: 'after'
    })

  let newCount = await db.aggregate("referral_code_counter", [
    {
      $match: { year: new Date().getFullYear(), city: city, agencyCode: agencyCode },
    }, {
      $sort: {
        count: -1
      }
    },
    {
      $limit: 1
    }

  ])


  let count = -1;
  if (newCount[0]) {
    count = newCount[0].count
  }




  const code = generateCode({
    year: newCount[0].year,
    agencyCode: agencyCode,
    cityName: cities.find(o => o.value == city).title, //get city name
    personIndex: count
  });

  let ref_code = await db.update(
    'referral_code',
    {}, // Match condition — update all or define a specific filter
    {
      $push: {
        codes: {
          $each: [{
            code: code,
            role: role
          }]
        }
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  ); \


  return responseHandler.okResponse(res, "Code generated", { code: code, role: role })

})


// ############################################
// ############################################
// ############################################
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



mongo(config.DB_URI, config.MOBILE_DB_NAME)
  .then(async (DB) => {
    db = DB;








  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message })

  });



module.exports = router;
