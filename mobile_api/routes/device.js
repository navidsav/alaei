const express = require("express");
const Device = require("../models/Device");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");

const router = express.Router();
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const config = require("../../config.json");

const DeviceConnectionManager = require("../../common/device_connection_manager")

let deviceConnectionManager = new DeviceConnectionManager();


const moment = require("moment");

let db = {};




router.post("/GetRoute", async (req, res) => {
  try {

    const { CarId, StartDate, EndDate } = req.body;


    let dateFrom = new Date(StartDate).toISOString();


    let dateTo = new Date(EndDate).toISOString();


    let aggregations = [
      {
        $match: {
          "_id": new mongodb.ObjectId(req.user.id),
          "registeredCars._id": new mongodb.ObjectId(CarId)
        }
      },
    ];

    const carsList = await db.aggregate("users", aggregations);


    let imei = "";
    if (carsList.length > 0) {

      for (let i = 0; i < carsList[0].registeredCars.length; ++i) {
        let car = carsList[0].registeredCars[i];

        if (car._id == CarId) {
          imei = car.deviceInfo.imei;
          break;
        }

      }

    }

    console.log(" ================ dateFrom : ", dateFrom)
    console.log(" ================ dateTo : ", dateTo)

    // GEt device locations
    let locationAggregation = [{
      $unwind: {
        path: "$locations"
      }
    },
    {
      $match: {
        imei: imei,
        "locations.time": {
          $gte: dateFrom,
          $lte: dateTo
        }
      }
    },
    {
      $project: {
        locations: 1,
        location: "$locations"
      }
    },
    {
      $sort: {
        "location.time": 1
      }
    },
    {
      $project:
      /**
       * specifications: The fields to
       *   include or exclude.
       */
      {
        location: 1
      }
    }
    ];

    const packetsQuery = await db.aggregate("devices", locationAggregation);
    // let points = [
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:00:00Z",
    //     "noSatellites": 10,
    //     "gps": [35.7006, 51.3381],
    //     "speed": 0,
    //     "course": 90,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:00:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:02:00Z",
    //     "noSatellites": 9,
    //     "gps": [35.7009, 51.3457],
    //     "speed": 10,
    //     "course": 93,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:02:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:04:00Z",
    //     "noSatellites": 8,
    //     "gps": [35.7007, 51.3569],
    //     "speed": 20,
    //     "course": 96,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:04:00Z",
    //     "alarm": {
    //       title: "SOS",
    //       icon: `${config.CDN_URL}/app/asset/image/alarm/sos.png`
    //     }
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:06:00Z",
    //     "noSatellites": 10,
    //     "gps": [35.7006, 51.3645],
    //     "speed": 30,
    //     "course": 99,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:06:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:08:00Z",
    //     "noSatellites": 9,
    //     "gps": [35.701, 51.3739],
    //     "speed": 40,
    //     "course": 102,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:08:00Z",
    //     "alarm": {
    //       title: "Harsh Breaking",
    //       icon: `${config.CDN_URL}/app/asset/image/alarm/breaking.png`
    //     }
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:10:00Z",
    //     "noSatellites": 8,
    //     "gps": [35.7012, 51.3822],
    //     "speed": 0,
    //     "course": 105,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:10:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:12:00Z",
    //     "noSatellites": 10,
    //     "gps": [35.7013, 51.3897],
    //     "speed": 10,
    //     "course": 108,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:12:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:14:00Z",
    //     "noSatellites": 9,
    //     "gps": [35.706, 51.3945],
    //     "speed": 20,
    //     "course": 111,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:14:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:16:00Z",
    //     "noSatellites": 8,
    //     "gps": [35.7098, 51.4],
    //     "speed": 30,
    //     "course": 114,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:16:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:18:00Z",
    //     "noSatellites": 10,
    //     "gps": [35.713, 51.4075],
    //     "speed": 40,
    //     "course": 117,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:18:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:20:00Z",
    //     "noSatellites": 9,
    //     "gps": [35.7175, 51.4142],
    //     "speed": 0,
    //     "course": 120,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:20:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:22:00Z",
    //     "noSatellites": 8,
    //     "gps": [35.724, 51.423],
    //     "speed": 10,
    //     "course": 123,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:22:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:24:00Z",
    //     "noSatellites": 10,
    //     "gps": [35.7285, 51.43],
    //     "speed": 20,
    //     "course": 126,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:24:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:26:00Z",
    //     "noSatellites": 9,
    //     "gps": [35.735, 51.4372],
    //     "speed": 30,
    //     "course": 129,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:26:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:28:00Z",
    //     "noSatellites": 8,
    //     "gps": [35.74, 51.4453],
    //     "speed": 40,
    //     "course": 132,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:28:00Z"
    //   },
    //   {
    //     "input": 1,
    //     "tag": "R",
    //     "case": "22",
    //     "time": "2025-05-05T08:30:00Z",
    //     "noSatellites": 10,
    //     "gps": [35.748, 51.4517],
    //     "speed": 0,
    //     "course": 90,
    //     "cellTower": null,
    //     "info_serial_no": "ABC123",
    //     "imei": "0351510092326092",
    //     "socket": "SOCKET1",
    //     "device": "NA",
    //     "client": "tehran_fleet",
    //     "createdAt": "2025-05-05T08:30:00Z"
    //   }
    // ];

    // packetsQuery.forEach(packet => {
    //   if (packet.locations) {
    //     points.push(...packet.locations)
    //   }
    // });



    return response_handler.okResponse(res, "Here you are!", packetsQuery)

  } catch (error) {
    logger.error({ event: 'ERROR GET ROUTE', error: error?.message })

    return response_handler.errorResponse(res, "Server error", {})
  }
});

// ######################################################
router.post("/GetLastPosition", async (req, res) => {
  try {
    const { CarId,
      ShowJointCars } = req.body;

    // TODO:  Make it better this shit query and fetching herer
    let imei = "";

    let userCarImei = await db.aggregate("users", [{
      $match: {
        "registeredCars._id": new mongodb.ObjectId(CarId)
      }
    }]);

    if (userCarImei && userCarImei.length > 0) {
      let regCar = userCarImei[0].registeredCars.find(car => car._id.toString() == CarId);
      if (regCar) {
        imei = regCar.deviceInfo.imei;

      }
    }


    let locationAggregation = [
      {
        $unwind:
        /**
         * Provide any number of field/order pairs.
         */
        {
          path: "$locations"
        },
      },

      {
        $sort:
        /**
         * Provide any number of field/order pairs.
         */
        {
          "locations.time": -1,
        }
      },

      {
        $match: {
          imei: imei,
          "locations.alarm": {
            $eq: null
          }
        }
      },
      {
        $project: {
          locations: 1,
          location: "$locations"
        }
      },
      {
        $project: {
          location: 1,
        }
      },
      {
        $limit:
          /**
           * Provide the number of documents to limit.
           */
          1
      }
    ];

    let statusAggregation = [
      {
        $unwind:
        /**
         * Provide any number of field/order pairs.
         */
        {
          path: "$statuses"
        },
      },

      {
        $sort:
        /**
         * Provide any number of field/order pairs.
         */
        {
          "statuses.time": -1,
        }
      },

      {
        $match: {
          imei: imei,
          "statuses.alarm": {
            $eq: null
          }
        }
      },
      {
        $project: {
          statuses: 1,
          status: "$statuses"
        }
      },
      {
        $project: {
          status: 1,
        }
      },
      {
        $limit:
          /**
           * Provide the number of documents to limit.
           */
          1
      }
    ];


    let lastMagicarMessageAggregation = [{
      $unwind: {
        path: "$registeredCars",
      }
    }, {
      $match: {
        "registeredCars._id": new mongodb.ObjectId(CarId),
      }
    }, {
      $unwind: {
        path: "$registeredCars.magicar_messages",
      }
    },
    {
      $sort: {
        "registeredCars.magicar_messages.time": -1
      }
    },
    {
      $project: {
        "magicar_message": "$registeredCars.magicar_messages",
      }
    },
    {
      $limit: 1
    }
    ];



    let locationQuery = await db.aggregate("devices", locationAggregation);
    let statusQuery = await db.aggregate("devices", statusAggregation);
    let lastMagicarMessageQuery = await db.aggregate("users", lastMagicarMessageAggregation);

    let finalPosition = {};
    let finalStatus = {};
    let finalLastMagicarMessage = {};
    if (locationQuery.length > 0) {
      let position = locationQuery[0].location;
      if (position) {
        position.DiffInSecs = moment.duration(moment().utc(false).diff(moment(position?.time).utc(false))).asSeconds();
        finalPosition = position;
      }
    }

    if (statusQuery.length > 0) {
      let status = statusQuery[0].status;

      if (status) {
        let results = await deviceConnectionManager.xRead(config.STREAM_DEVICE_CONNECTION, status.imei);
        if (results) {

          const [key, messages] = results[0]; // `key` equals to "mystream"

          let state = ""
          messages.forEach((message) => {

            for (let i = 0; i < message[1].length; ++i) {
              if (message[1][i] == "state") {
                state = message[1][i + 1];
              }

            }

          });

          status.socketState = state;

        }
        else {
          status.socketState = "UNKNOWN";

        }
        status.DiffInSecs = moment.duration(moment().utc(false).diff(moment(status?.time).utc(false))).asSeconds();
        status.Credit = 0;
        finalStatus = status;
      }

    }

    if (lastMagicarMessageQuery.length > 0) {
      let magicar_message = lastMagicarMessageQuery[0].magicar_message;
      if (magicar_message) {
        magicar_message.DiffInSecs = moment.duration(moment().utc(false).diff(moment(magicar_message?.time).utc(false))).asSeconds();
        finalLastMagicarMessage = magicar_message;
      }
    }


    return response_handler.okResponse(res, "Here you are", {
      CarId: CarId,
      "position": [finalPosition],
      "status": [finalStatus],
      "magicar_message": [finalLastMagicarMessage]
    });


  }
  catch (error) {


    logger.error({ event: "HTTP POST /device/GetLastPosition ERROR", error: error?.message })
    return response_handler.errorResponse(res, "Server error", { error: error })
  }
});



router.post("/changeSimNumber", async (req, res) => {
  try {

    const { carId, simNumber } = req.body;

    let update = await db.update('users', {
      _id: new mongodb.ObjectId(req.user.id),
      "registeredCars._id": new mongodb.ObjectId(carId)
    }, {
      $set: {
        "registeredCars.$.deviceInfo.simNumber": simNumber,

      }
    }, {
      upsert: true
    })
    return response_handler.okResponse(res, "Successfully changed!", { carId: carId, simNumber: simNumber })

  } catch (error) {
    logger.error({ event: 'ERROR changeSimNumber', error: error?.message })

    return response_handler.errorResponse(res, "changeSimNumber Server error", { error: error?.message })
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
