const express = require("express");
const ColorModel = require("../models/ColorModel");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");


const router = express.Router();


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



module.exports = router;
