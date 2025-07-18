const express = require("express");
const Device = require("../models/Device");
const frameHelper = require("../../device_gateway/magicarParser/frameHelper");
const device_api_handler = require("../middleware/device_api_handler");
const device_api_handler_dvr = require("../middleware/device_api_handler_dvr");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const helper = require("../../common/helper");
const querystring = require('querystring');
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const responseHandler = require("./response_handler");
const config = require("../../config.json")



const redis = require("redis");
const redis_client = redis.createClient({
  url: config.REDIS_URI,
  legacyMode: true
});

(async () => {
  let ss = await redis_client.connect()
  let qq = "asd"
})();
redis_client.on("error", (err) => {
  logger.error({ event: "Redis connecting error commands.js", err: err });
});



let db = {};


const router = express.Router();


router.post("/getChecklist", async (req, res) => {
  try {
    const { carId } = req.body;



    const carsList = await db.aggregate("users", [
      {
        $match: {
          "_id": new mongodb.ObjectId(req.user.id),
          "registeredCars._id": new mongodb.ObjectId(carId)
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

      let car = carsList[0].registeredCars.find(car => car._id == carId);
      let carBrand = {};
      let carModel = {};

      let readyBrand = carsList[0].carBrands.find(brand => brand.CarModels.findIndex(model => model.CarModelDetails.findIndex(det => det._id.toString() == car.carInfo.carModelId.toString()) >= 0) >= 0);

      if (!readyBrand) {
        return responseHandler.nokResponse(res, "لطفا مدل و برند خودرو رو مشخص کنین", {})
      }

      if (readyBrand) {
        readyBrand.CarModels.forEach(model => {
          model.CarModelDetails.forEach(modelDetail => {
            if (modelDetail._id.toString() == car.carInfo.carModelId.toString()) {
              carBrand = { ...readyBrand };
              carModel = { ...model };

            }
          })
        });
        let yy = delete carBrand['CarModels'];
        yy = delete carModel['CarModelDetails'];
      }


      let checklist = [];
      if (car && carModel) {

        let checkListProps = Object.getOwnPropertyNames(carModel.checklist);



        checkListProps.forEach((checkItem, inx) => {
          checklist.push({
            id: inx,
            checkItem: checkItem,
            title: `${carModel.checklist[checkItem].title}`,
            value: car.checklist_milage[checkItem],
            desc: `${carModel.checklist[checkItem].desc}`,
            progress: ((car.checklist_milage[checkItem]) / carModel.checklist[checkItem].value),
            link: `${carModel.checklist[checkItem].shop_uri}`,
            from: 0,
            to: carModel.checklist[checkItem].value,
            fromIconUri: `${config.CDN_URL}/images/${carModel.checklist[checkItem].icon_uri}`,
            toIconUri: `${config.CDN_URL}/images/${carModel.checklist[checkItem].icon_uri}`,
            onlineShoppingIcon: `${config.CDN_URL}/images/online_shopping.png`,
            changedIcon: `${config.CDN_URL}/images/changed.png`,
          });
        });
        return responseHandler.okResponse(res, "Here you are!", checklist)

      }
      return responseHandler.nokResponse(res, "Could not find the car", {})



    }
    else {
      return responseHandler.nokResponse(res, "Could not find the car", {})
    }


  } catch (error) {
    logger.error({ event: "HTTP POST SendCommand ERROR", body: req.body, error: error?.message });
    return response_handler.errorResponse(res, "Server error", { req: req.body })

  }
});


// update

router.post("/resetCounter", async (req, res) => {



  const { carId, checkItem, value, currentMilage } = req.body;



  try {

    db.update('users', {
      _id: new mongodb.ObjectId(req.user.id),
      "registeredCars._id": new mongodb.ObjectId(carId)
    }, {
      $set: {
        [`registeredCars.$.checklist_milage.${checkItem}`]: value,
      },
      $push: {
        [`registeredCars.$.checklist_milage_log.${checkItem}`]: {
          $each: [{
            'milage': currentMilage,
            'reset_at': new Date().toISOString()
          }]
        }

      }
    }, {
      upsert: false
    })
      .then((r) => {
        logger.debug({ message: "resetCounter updated successfully", reqbody: req.body });

        return responseHandler.okResponse(res, "resetCounter updated successfully", {})

      })
      .catch((e) => {
        logger.error({ event: "Error in resetCounter ", reqbody: req.body, error: e?.message });
        return responseHandler.errorResponse(res, "Error in resetCounter", req.body)

      });




  } catch (error) {

    logger.error({ event: "Server Error in resetCounter ", reqbody: req.body, error: error?.message });

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
