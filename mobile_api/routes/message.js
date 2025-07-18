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

router.post("/getCarMessage", async (req, res) => {



  let { CarId } = req.body;

  try {


    let aggregations = [
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
        $match:
        /**
         * query: The query in MQL.
         */
        {
          "registeredCars._id": new mongodb.ObjectId(CarId)
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
        $set: {
          "registeredCars.messages": {
            $sortArray: {
              input: "$registeredCars.messages",
              sortBy: { time: -1 }
            }
          }
        }
      }
    ];

    let result = await db.aggregate("users", aggregations);


    return response_handler.okResponse(res, "Sent", result)

  }

  catch (err) {
    logger.error({ event: "Server Error Get Car Messages", error: err.message, stack: err.stack })
    return response_handler.errorResponse(res, "Car Messages Server Error", { error: err.message })

  }

})

router.post("/getUserMessage", async (req, res) => {



  try {


    let aggregations = [

      {
        $match:
        /**
         * query: The query in MQL.
         */
        {
          "_id": new mongodb.ObjectId(req.user.id)
        }
      },
      {
        $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
          "messages": 1
        }
      },
      {
        $set: {
          "messages": {
            $sortArray: {
              input: "$messages",
              sortBy: { time: -1 }
            }
          }
        }
      }
    ];

    let result = await db.aggregate("users", aggregations);


    return response_handler.okResponse(res, "Sent", result)

  }

  catch (err) {
    logger.error({ event: "Server Error Get User Messages", error: err.message, stack: err.stack })
    return response_handler.errorResponse(res, "User Messages Server Error", { error: err.message })

  }
})


router.post("/ChanegMessageStatus", async (req, res) => {


  let { messageId, targetStatus, messageType } = req.body;

  try {


    let cars = await db.aggregate("users", [
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
        $project: {
          car_id: "$registeredCars._id",
          messages: "$registeredCars.messages"
        }
      },
      {
        $unwind: {
          path: "$messages"
        }
      },
      {
        $match:
        /**
         * query: The query in MQL.
         */
        {
          "messages._id": new mongodb.ObjectId(messageId)
        }
      }
    ]);

    // IF IT IS A USER MESSAGE
    if (messageType == "user") {
      db.update('users', {
        _id: new mongodb.ObjectId(req.user.id),
        "messages._id": new mongodb.ObjectId(messageId)
      }, {
        $set: {
          [`messages.$.status`]: targetStatus,
        },

      }, {
        upsert: false
      })
        .then((r) => {
          logger.debug({ message: "message change statusu updated successfully", reqbody: req.body });

          return response_handler.okResponse(res, "message change statusu updated successfully", {})

        })
        .catch((e) => {
          logger.error({ event: "Error in message change statusu ", reqbody: req.body, error: e?.message });
          return response_handler.errorResponse(res, "Error in message change statusu", req.body)

        });

    }
    else  // IF IT IS A car MESSAGE
      if (messageType == "car") {

        db.update('users', {
          _id: new mongodb.ObjectId(req.user.id),
          "registeredCars.messages._id": new mongodb.ObjectId(messageId)
        }, {
          $set: {
            [`registeredCars.$[outer].messages.$[inner].status`]: targetStatus,
          },


        }, {
          arrayFilters: [
            { "outer._id": cars[0].car_id },
            { "inner._id": new mongodb.ObjectId(messageId) }
          ]
        }, {
          upsert: false
        })
          .then((r) => {
            logger.debug({ message: "message change statusu updated successfully", reqbody: req.body });

            return response_handler.okResponse(res, "message change statusu updated successfully", {})

          })
          .catch((e) => {
            logger.error({ event: "Error in message change statusu ", reqbody: req.body, error: e?.message });
            return response_handler.errorResponse(res, "Error in message change statusu", req.body)

          });

      }
      else  // IF IT IS A OTA MESSAGE
        if (messageType == "ota") {
          db.update('devices', {
            "online_commands._id": new mongodb.ObjectId(messageId)
          }, {
            $set: {
              [`online_commands.$.status`]: targetStatus,
            },

          }, {
            upsert: false
          })
            .then((r) => {
              logger.debug({ message: "message change statusu updated successfully", reqbody: req.body });

              return response_handler.okResponse(res, "message change statusu updated successfully", {})

            })
            .catch((e) => {
              logger.error({ event: "Error in message change statusu ", reqbody: req.body, error: e?.message });
              return response_handler.errorResponse(res, "Error in message change statusu", req.body)

            });

        }







    // return response_handler.okResponse(res, "Sent", req.body)

  }

  catch (err) {
    logger.error({ event: "Server Error Get User Messages", error: err.message, stack: err.stack })
    return response_handler.errorResponse(res, "User Messages Server Error", { error: err.message })

  }
})


router.post("/ChanegMessageStatusAll", async (req, res) => {
  let { messageType } = req.body;


  if (messageType == "car") {

  }

});


router.get("/getSummery", async (req, res) => {

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


    let userMessages = await db.aggregate("users", [
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
          path: "$messages"
        }
      },
      {
        $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
          "messages": 1
        }
      },
      {
        $match: {
          "messages.status": config.HAS_BEEN_RECIEVED
        }
      },
      {
        $count: "count"
      }
    ]);


    let userMessagesCount = userMessages.length > 0 ? userMessages[0]?.count : 0
    let carMessagesCount = carMessages.length > 0 ? carMessages[0]?.count : 0

    return response_handler.okResponse(res, "Here you are", {
      "unread_car_messages_count": carMessagesCount,
      "unread_user_messages_count": userMessagesCount,
      "unread_ota_messages_count": 444,
      "active_plan_remained": 365

    })

  }
  catch (error) {
    logger.error({ event: "Server Error Get Summery", error: error?.message, stack: error?.stack })
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



    let aggregations = [
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
        $project: {
          car_id: "$registeredCars._id",
          messages: "$registeredCars.messages"
        }
      },
      {
        $unwind: {
          path: "$messages"
        }
      },
      {
        $match:
        /**
         * query: The query in MQL.
         */
        {
          "messages._id": new mongodb.ObjectId(
            "683b0743f7fe2fde0d9567fa"
          )
        }
      }
    ];


    let result = await db.aggregate("users", aggregations);


    let ss = "Asd";

    // // let result = await db.aggregate("devices", aggregations);
    // logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e })


  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', error: e?.message })

  });

module.exports = router;
