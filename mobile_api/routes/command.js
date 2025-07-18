const express = require("express");
const Device = require("../models/Device");
const frameHelper = require("../../device_gateway/magicarParser/frameHelper");
const device_api_handler = require("../middleware/device_api_handler");
const device_api_handler_dvr = require("../middleware/device_api_handler_dvr");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const querystring = require('querystring');


const redis = require("redis");
const config = require("../../config.json");
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


const router = express.Router();


router.post("/sendcommandOTA", async (req, res) => {


  let { Command, imei } = req.body;



  if (!imei.startsWith("0")) {
    imei = `0${imei}`;
  }

  const data = { imei: imei, message_to_send: Command, time: Date.now() }

  redis_client.sadd(
    `ota_commands`,
    JSON.stringify(data),
    (err, data) => {
      if (err) {
        logger.error({ event: "Redis sadd error commands.js", err: err });

        //                                              resolve(null);
      } else {

      };
    }
  );

  return response_handler.okResponse(res, "Sent", { req: data })

});


router.post("/sendcommand", async (req, res) => {
  try {
    const { ActionId, Command, CarId } = req.body;

    let frameToSend = frameHelper.generateFrame(ActionId, Command);

    let sendingData = {
      "carId": CarId,
      "time": Date.now(),
      "content": frameToSend,
    };
    let result = await device_api_handler({
      url: "/concox/transparent_data",
      data: sendingData,
      method: "POST"
    });

    // res.json({ "ok": true, "status": "Done" })

    return response_handler.okResponse(res, "Sent! Wait for acknowledge", {})

  } catch (error) {
    logger.error({ event: "HTTP POST SendCommand ERROR", body: req.body, error: error?.message });
    return response_handler.errorResponse(res, "Server error", { req: req.body })

  }
});


router.post("/sendcommandDVR", async (req, res) => {
  try {
    let { cmdContent, proNo, requestId, imei } = req.body;

    if (imei.startsWith("0")) {
      imei = imei.substring(1);
    }


    let sendingData = querystring.stringify({
      "deviceImei": imei,
      "imei": imei,
      "cmdContent": JSON.stringify(cmdContent),
      "serverFlagId": "0",
      "proNo": proNo,
      "platform": "web",
      "requestId": requestId,
      "cmdType": "normalIns",
      "token": "123"
    });
    let result = await device_api_handler_dvr({
      url: "/api/device/sendInstruct",
      data: sendingData,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: "POST"
    });



    return response_handler.okResponse(res, "Sent", {  })




  } catch (error) {
    logger.error({ event: "HTTP POST SendCommand ERROR", body: req.body, error: error?.message });
    return response_handler.errorResponse(res, "Server error", { req: req.body })

  }
});


module.exports = router;
