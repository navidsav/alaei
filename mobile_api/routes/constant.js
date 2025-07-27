const express = require("express");
const ColorModel = require("../models/ColorModel");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");

const config = require("../../config.json");
const delivery_status = require("../../common/car/delivery_status");
const body_status = require("../../common/car/body_status");
const colors = require("../../common/car/colors");
const colors_interior = require("../../common/car/colors_interior");

const router = express.Router();

let db = {};


router.get("/color", async (req, res) => {

  try {
    // Find the authenticated user
    const colors = await ColorModel.find({}, 'colorName _id')

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", colors)
  } catch (error) {
    logger.error({ event: "HTTP GET COLORS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});



function queryBuilder(req, res, next) {
  const query = {};
  const { pageNum, perpage } = req.query;

  if (pageNum && perpage) query.limit = parseInt(pageNum * perpage);
  if (pageNum && perpage) query.skip = parseInt((pageNum - 1) * perpage);

  req.mongoQuery = query;
  next();
}



// ############################################
// ############################################
// ############################################
router.get("/getbrands", queryBuilder, async (req, res) => {

  try {

    let { brand, minYear, maxPrice } = req.query;

    brand = brand == undefined || brand == null ? "" : brand;
    let aggregation = [{
      $match: {
        "BrandTitle": { $regex: brand, $options: "i" }
      },
    },
    {
      $project: {
        _id: 1,
        BrandTitle: 1,
        BrandLogoUrl: "https://images.seeklogo.com/logo-png/16/1/porsche-logo-png_seeklogo-168544.png"
      }
    }];

    let total = 0;
    if (req.mongoQuery.skip) {

      let totalAgg = [...aggregation, {
        $count: "total"
      }]

      total = await db.aggregate("carbrands", totalAgg);

      aggregation.push({
        $skip: req.mongoQuery.skip
      });
    }
    if (req.mongoQuery.limit) {
      aggregation.push({
        $limit: req.mongoQuery.limit
      });
    }

    const cars = await db.aggregate("carbrands", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { brands: cars, total: total })
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});


// ############################################
// ############################################
// ############################################
router.post("/getModelsByBrand", queryBuilder, async (req, res) => {

  try {

    let { model, minYear, maxPrice } = req.query;
    model = model == undefined || model == null ? "" : model;

    const { brandId } = req.body;

    let aggregation = [
      {
        $match: {
          "_id": new mongodb.ObjectId(brandId)
        }
      },
      {
        $unwind: {
          path: "$CarModels"
        }
      },
      {
        $project: {
          _id: 0,
          CarModel: "$CarModels"
        }
      },
      {
        $project: {
          CarModel: 1
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$CarModel", "$$ROOT"]
          }
        }
      },
      {
        $project: {
          "CarModelTitle": 1
        }
      },
      {
        $match: {
          "CarModelTitle": { $regex: model, $options: "i" }
        }
      }
    ];



    if (req.mongoQuery.skip) {
      aggregation.push({
        $skip: req.mongoQuery.skip
      });
    }
    if (req.mongoQuery.limit) {
      aggregation.push({
        $limit: req.mongoQuery.limit
      });
    }

    const cars = await db.aggregate("carbrands", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", cars)
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});


// ############################################
// ############################################
// ############################################
router.get("/getProductionYears", queryBuilder, async (req, res) => {

  try {

    const years = [];
    for (let i = 1370; i < 1405; ++i) {
      years.push(i);
    }

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", years)
  } catch (error) {
    logger.error({ event: "HTTP GET ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});


// ############################################
// ############################################
// ############################################
router.post("/getTrimsByModel", queryBuilder, async (req, res) => {

  try {

    let { trim, minYear, maxPrice } = req.query;
    trim = trim == undefined || trim == null ? "" : trim;

    const { modelId } = req.body;

    let aggregation = [{
      $unwind: {
        path: "$CarModels"
      }
    },
    {
      $project: {
        _id: 0,
        CarModel: "$CarModels"
      }
    },
    {
      $project: {
        CarModel: 1
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ["$CarModel", "$$ROOT"]
        }
      }
    },
    {
      $project: {
        "CarModel.CarModelDetails": 1
      }
    },
    {
      $match: {
        _id: new mongodb.ObjectId(modelId)
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ["$CarModel", "$$ROOT"]
        }
      }
    },
    {
      $unwind: {
        path: "$CarModelDetails"
      }
    },
    {
      $project: {
        _id: 0,
        CarModelDetail: "$CarModelDetails"
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$CarModelDetail",
            "$$ROOT"
          ]
        }
      }
    },
    {
      $project: {
        CarModelDetailTitle: 1
      }
    },
    {
      $match: {
        "CarModelDetailTitle": { $regex: trim, $options: "i" }
      }
    }];


    if (req.mongoQuery.skip) {
      aggregation.push({
        $skip: req.mongoQuery.skip
      });
    }
    if (req.mongoQuery.limit) {
      aggregation.push({
        $limit: req.mongoQuery.limit
      });
    }

    const cars = await db.aggregate("carbrands", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", cars)
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});







// ############################################
// ############################################
// ############################################
router.get("/getDeliveryStatus", async (req, res) => {

  return response_handler.okResponse(res, "Car Status and usages and delivery", { states: delivery_status })

})


// ############################################
// ############################################
// ############################################
router.get("/getBodyStatus", async (req, res) => {


  return response_handler.okResponse(res, "Car Body Status", { states: body_status })

})


// ############################################
// ############################################
// ############################################
router.get("/getColors", async (req, res) => {

  return response_handler.okResponse(res, "Car Colors", { interior_color: colors_interior, color: colors })

})

mongo(config.DB_URI, config.MOBILE_DB_NAME)
  .then(async (DB) => {
    db = DB;



    // // GEt device locations
    // let locationAggregation = [
    //   {
    //     $match: {
    //       "imei": "0351510092326092",
    //       "hour_window": {
    //         $gte: "2025-04-25",
    //         $lte: "2025-04-26"
    //       }
    //     }
    //   },
    // ];

    // const packetsQuery = await db.aggregate("devices", locationAggregation);
    // let points = [];
    // packetsQuery.forEach(packet => {
    //   if (packet.locations) {
    //     points.push(...packet.locations)
    //   }
    // });

    // let ssss = "asd";

  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message })

  });




module.exports = router;
