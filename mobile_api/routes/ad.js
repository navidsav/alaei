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
const queryBuilder = require("../../common/query")

const router = express.Router();

let db = {};



// ############################################
// ############################################
// ############################################
router.get("/add", async (req, res) => {

  try {

    let {
      brand_id,
      model_id,
      trim_id,
      production_year,
      

      body_color_id,
      interior_color_id,
      body_status_id,
      delivery_days_id,
      device_status_id,
      installment_numbers,
      month_numbers
    } = req.body;

    // Find the authenticated user
    const colors = await ColorModel.find({}, 'colorName _id')

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", colors)
  } catch (error) {
    logger.error({ event: "HTTP GET COLORS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});




// ############################################
// ############################################
// ############################################
router.get("/getAds", queryBuilder, async (req, res) => {

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

    let total = -1;

    let totalAgg = [...aggregation, {
      $count: "total"
    }]

    total = await db.aggregate("carbrands", totalAgg);


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

    const brands = await db.aggregate("carbrands", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { brands: brands, total: total[0].total })
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});



// ############################################
// ############################################
// ############################################
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
