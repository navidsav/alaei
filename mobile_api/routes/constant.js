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
  const { brand, minYear, maxPrice } = req.query;

  if (brand) query.brand = brand;
  if (minYear) query.year = { ...query.year, $gte: Number(minYear) };
  if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

  req.mongoQuery = query;
  next();
}
router.get("/getbrands",queryBuilder, async (req, res) => {

  try {

    const cars = await db.aggregate("carbrands", [{
      $match: {
        "BrandTitle": { $regex:req.mongoQuery.brand }
      }
    }])


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
