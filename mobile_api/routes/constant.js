const express = require("express");
const ColorModel = require("../models/ColorModel");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");

const config = require("../../config.json")

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

    const { brand, minYear, maxPrice } = req.query;

    let aggregation = [];
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
    if (brand) {
      aggregation.push(
        {
          $match: {
            "BrandTitle": { $regex: brand }
          },
        },
        {
          $project: {
            _id: 1,
            BrandTitle: 1,
            BrandLogoUrl: 1
          }
        }
      );
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
router.post("/getModelsByBrand", queryBuilder, async (req, res) => {

  try {

    const { model, minYear, maxPrice } = req.query;
    const { brandId } = req.body;

    let aggregation = [];

    if (model) {
      aggregation.push(
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
            "CarModelTitle": { $regex: model }
          }
        }
      );
    }

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

    console.log(" cc : ", JSON.stringify(aggregation))

    const cars = await db.aggregate("carbrands", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", cars)
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});






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
