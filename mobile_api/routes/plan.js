const express = require("express");
const Device = require("../models/Device");
const frameHelper = require("../../device_gateway/magicarParser/frameHelper");
const device_api_handler = require("../middleware/device_api_handler");
const device_api_handler_dvr = require("../middleware/device_api_handler_dvr");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const querystring = require('querystring');
const mongoose = require('mongoose');
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");


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



router.post("/getOTAMessage", async (req, res) => {


  let { imei } = req.body;

  try {


    if (!imei.startsWith("0")) {
      imei = `0${imei}`;
    }

    let aggregations = [{
      $match: {
        "imei": imei,
        "online_commands": { $ne: null }
      }
    },
    {
      $unwind:
      {
        path: "$online_commands"
      }
    },
    // {
    //   $group: {
    //     _id: "online_commands"
    //   }
    // },
    // {
    //   $unwind: {
    //     path: "$_id"
    //   }
    // },
    // {
    //   $match: {
    //     "_id.imei": imei
    //   }
    // },
    {
      $project: {
        // "online_commands": 1,
        "online_commands.input": 0,
        "online_commands.socket": 0,
        "hour_window": 0,
        "statuses": 0,
        "locations": 0,
        "messages": 0,


      }
    },
    {
      $sort:

      {
        "online_commands.time": -1,
      }
    },
    {
      $limit: 50
    }
    ];

    let result = await db.aggregate("devices", aggregations);


    return response_handler.okResponse(res, "Sent", { response: result })

  }

  catch (err) {
    logger.error({ event: "Server Error Get OTA", error: err.message, stack: err.stack })
    return response_handler.errorResponse(res, "Server Error", { error: err.message })

  }

});




router.get("/getAll", async (req, res) => {

  try {

    let carMessages = await db.aggregate("users", [
      {
        $match: {
          _id: new mongodb.ObjectId(req.user.id)
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
          path: "$registeredCars"
        }
      },
      {
        $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
          "registeredCars.messages": 1
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
          path: "$registeredCars.messages"
        }
      },
      {
        $match: {
          "registeredCars.messages.status": config.HAS_BEEN_RECIEVED
        }
      },
      {
        $count:
          /**
           * Provide the field name for the count.
           */
          "count"
      }
    ])



    let plans = [{
      "PlanId": 36,
      "PlanCode": "100",
      "PlanTitle": "طرح یک ساله طلایی",
      "Cost": 3400000,
      "DayCount": 365,
      "Description": "دسترسی کامل و نا محدود به امکانات اپ",
      "payment_url": `https://ws.magicarmobile.ir/Plugins/payment/MethodSelection.aspx?planId=${36}&userId=14521&isWeb=0`,

    }, {
      "PlanId": 32,
      "PlanCode": "101",
      "PlanTitle": "طرح شش ماهه طلایی",
      "Cost": 1900000,
      "DayCount": 180,
      "Description": "دسترسی کامل و نا محدود به امکانات اپ",
      "payment_url": `https://ws.magicarmobile.ir/Plugins/payment/MethodSelection.aspx?planId=${32}&userId=14521&isWeb=0`,
    }, {
      "PlanId": 30,
      "PlanCode": "102",
      "PlanTitle": "طرح سه ماهه طلایی",
      "Cost": 1020000,
      "DayCount": 90,
      "Description": "دسترسی کامل و نا محدود به امکانات اپ",
      "payment_url": `https://ws.magicarmobile.ir/Plugins/payment/MethodSelection.aspx?planId=${30}&userId=14521&isWeb=0`,
    }, {
      "PlanId": 20,
      "PlanCode": "103",
      "PlanTitle": "طرح یک ماهه طلایی",
      "Cost": 360000,
      "DayCount": 30,
      "Description": "دسترسی کامل و نا محدود به امکانات اپ",
      "payment_url": `https://ws.magicarmobile.ir/Plugins/payment/MethodSelection.aspx?planId=${20}&userId=14521&isWeb=0`,
    }]


    return response_handler.okResponse(res, "Here you are", plans)

  }
  catch (error) {
    logger.error({ event: "Server Error Get Plan All", error: error?.message, stack: error?.stack })
    return response_handler.errorResponse(res, "Server Error", { error: error?.message })

  }


});



mongo(config.DB_URI, config.MOBILE_DB_NAME)
  .then(async (DB) => {
    db = DB;


    // let cars = await db.aggregate("users", [
    //   {
    //     $match: {
    //       "registeredCars.messages._id": new mongodb.ObjectId("6832aaab3bd085bcd8c1b6d1")
    //     }
    //   }
    // ]);

    // let imei = "0351510092326092";



    // let aggregations = [{
    //   $match: {
    //     "imei": imei,
    //     "online_commands": { $ne: null }
    //   }
    // },
    // {
    //   $unwind:
    //   {
    //     path: "$online_commands"
    //   }
    // },
    // // {
    // //   $group: {
    // //     _id: "online_commands"
    // //   }
    // // },
    // // {
    // //   $unwind: {
    // //     path: "$_id"
    // //   }
    // // },
    // // {
    // //   $match: {
    // //     "_id.imei": imei
    // //   }
    // // },
    // {
    //   $project: {
    //     // "online_commands": 1,
    //     "online_commands.input": 0,
    //     "online_commands.socket": 0,
    //     "hour_window": 0,
    //     "statuses": 0,
    //     "locations": 0,
    //     "messages": 0,


    //   }
    // },
    // {
    //   $sort:

    //   {
    //     "online_commands.time": -1,
    //   }
    // },
    // {
    //   $limit: 50
    // }
    // ];


    // let result = await db.aggregate("devices", aggregations);



    // // let result = await db.aggregate("devices", aggregations);
    // logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e })


  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', error: e?.message })

  });

module.exports = router;
