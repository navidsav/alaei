const express = require("express");
const ColorModel = require("../models/ColorModel");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const multer = require('multer');
const { authenticate, authorize } = require("../middleware/auth")
const { aggAdder } = require("../middleware/ad")

const delivery_status = require("../../common/car/delivery_status");
const { loadBodyStatus } = require("../../common/car/body_status");
let body_status = [];
(async () => {
  body_status = await loadBodyStatus()
})();
const colors = require("../../common/car/colors");
const colors_interior = require("../../common/car/colors_interior");
const installment_number = require("../../common/car/installment_number");
const installment_month = require("../../common/car/installment_month");
const installment_delivery = require("../../common/car/installment_delivery");
const payment_type = require("../../common/car/payment_type");

const config = require("../../config.json");
const queryBuilder = require("../../common/query")

const router = express.Router();

let db = {};



// ############################################
// ############################################
// ############################################
const path = require("path");
const User = require("../models/User");
const { loadAdStatus } = require("../../common/car/ad_status");

// تنظیم محل ذخیره فایل‌ها و فرمت نام فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/var/www/cdn/alaei/uploads'); // پوشه مقصد (باید وجود داشته باشد یا ساخته شود)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + file.fieldname + ext); // نام فایل مثل: 1699999999999-image.jpg
  },
});

// فیلتر فقط تصاویر
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('فقط فایل‌های تصویری مجاز هستند!'), false);
  }
};

const upload = multer({ storage, fileFilter });
router.post("/add/:targetAdId?", authenticate, authorize("admin", "operator"), upload.array('images', 10), async (req, res) => {


  try {

    let {
      trim_id,
      production_year,
      delivery_status_type,
      delivery_status_value,
      body_color_value,
      interior_color_value,
      body_status_value,
      payment_type_value,
      payment_total_price,
      installment_total_price,
      installment_prepaid1,
      installment_part_price,
      installment_number_value,
      installment_delivery_days_value,
      installment_month_value,
      desc

    } = req.body;


    if (!req.params.targetAdId && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: 'هیچ تصویری ارسال نشده است' });
    }



    let statuses = await loadAdStatus();
    let user = await User.findById(req.user.id);
    let trim = await db.aggregate("carbrands", [
      {
        $unwind: {
          path: "$CarModels"
        }
      },

      {
        $unwind: {
          path: "$CarModels.CarModelDetails"
        }
      },
      {
        $match: {
          "CarModels.CarModelDetails._id": new mongodb.ObjectId(trim_id)
        }
      },
      {
        $project: {
          _id: 0,
          BrandTitle: 1,
          CarModelTitle: "$CarModels.CarModelTitle",
          CarModelDetail: "$CarModels.CarModelDetails.CarModelDetailTitle"
        }
      }
    ])

    let insertThis = {
      trim: { ...trim[0], trim_id },
      production_year: production_year,

      delivery_status_type: delivery_status.delivery_type.find(o => o.value == delivery_status_type),
      delivery_havale_type: delivery_status.havale_type.find(o => o.value == delivery_status_value),
      delivery_status_value: delivery_status_value,
      body_color: colors.find(o => o.value == body_color_value),
      interior_color: colors_interior.find(o => o.value == interior_color_value),
      body_status: body_status.find(o => o.value == body_status_value),
      payment_type: payment_type.find(o => o.value == payment_type_value),
      payment_total_price: payment_total_price,
      installment_total_price: installment_total_price,
      installment_number: installment_number.find(o => o.value == installment_number_value),
      installment_month: installment_month.find(o => o.value == installment_month_value),
      installment_delivery: installment_delivery.find(o => o.value == installment_delivery_days_value),
      installment_prepaid1: installment_prepaid1,
      installment_part_price: installment_part_price,

      user: {
        username: user.username,
        id: user.id,
        phoneNumber: user.phoneNumber,// TODO: read this online
        name: `${user.firstName} ${user.lastName}`
      },
      status: statuses.find(o => o.value == 0),
      descrption: desc,
      _id: new mongodb.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };




    if (req.params.targetAdId) {
      let updatingAd = { ...insertThis, _id: new mongodb.ObjectId(req.params.targetAdId) }

      if (req.files.length > 0) {
        const imageUrls = req.files.map(file => `${config.CDN_URL}/alaei/uploads/${file.filename}`);

        updatingAd.imageUrls = imageUrls
      }

      let updatingProps = Object.getOwnPropertyNames(updatingAd)
      let settingsProps = {}
      updatingProps.forEach(propName => {
        if (propName.indexOf("image") < 0)
          settingsProps[`registeredCarAds.$.${propName}`] = updatingAd[propName]
      });
      console.log(" ================= settingsProps : ", settingsProps)
      db.update('users', {
        _id: new mongodb.ObjectId(req.user.id),
        "registeredCarAds._id": new mongodb.ObjectId(req.params.targetAdId),
      }, {
        $set: settingsProps,
        // $push: {
        //   [`registeredCarAds`]: {
        //     $each: [insertThis]
        //   }

        // }
      }, {
        upsert: false
      })
        .then((r) => {
          logger.debug({ message: "Car ads updated successfully", reqbody: req.body });

          if (r.modifiedCount) {
            return response_handler.okResponse(res, "Car Ads updated successfully", { result: r, added: insertThis })

          }

          return response_handler.nokResponse(res, "Update failed", { result: r })

        })
        .catch((e) => {
          logger.error({ event: "Error in Car Ad updating ", reqbody: req.body, error: e?.message });
          return response_handler.errorResponse(res, "Error in Car Ad updating", req.body)

        });


    } else {

      if (req.files.length > 0) {
        const imageUrls = req.files.map(file => `${config.CDN_URL}/alaei/uploads/${file.filename}`);

        insertThis.imageUrls = imageUrls
      }

      db.update('users', {
        _id: new mongodb.ObjectId(req.user.id),
      }, {
        // $set: {
        //   [`registeredCars.$.checklist_milage.${checkItem}`]: value,
        // },
        $push: {
          [`registeredCarAds`]: {
            $each: [insertThis]
          }

        }
      }, {
        upsert: false
      })
        .then((r) => {
          logger.debug({ message: "Car ads added successfully", reqbody: req.body });


          return response_handler.okResponse(res, "Car Ads Added successfully", { result: r, added: insertThis })

        })
        .catch((e) => {
          logger.error({ event: "Error in Car Ad Adding ", reqbody: req.body, error: e?.message });
          return response_handler.errorResponse(res, "Error in Car Ad Adding", req.body)

        });

    }



    // Respond with the car details
    // return response_handler.okResponse(res, "Succeddfully added", { just_added: insertThis })
  } catch (error) {
    logger.error({ event: "HTTP Add Ad ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});




router.post("/verify", authenticate, authorize("admin", "operator"), upload.array("images", 10), async (req, res) => {



  try {

    let {
      trim_id,
      production_year,
      delivery_status_type,
      delivery_status_value,
      body_color_value,
      interior_color_value,
      body_status_value,
      payment_type_value,
      payment_total_price,
      installment_total_price,
      installment_prepaid1,
      installment_part_price,
      installment_number_value,
      installment_delivery_days_value,
      installment_month_value,
      desc

    } = req.body;

    let trim = await db.aggregate("carbrands", [
      {
        $unwind: {
          path: "$CarModels"
        }
      },

      {
        $unwind: {
          path: "$CarModels.CarModelDetails"
        }
      },
      {
        $match: {
          "CarModels.CarModelDetails._id": new mongodb.ObjectId(trim_id)
        }
      },
      {
        $project: {
          _id: 0,
          BrandTitle: 1,
          CarModelTitle: "$CarModels.CarModelTitle",
          CarModelDetail: "$CarModels.CarModelDetails.CarModelDetailTitle"
        }
      }
    ])



    // Respond with the car details
    return response_handler.okResponse(res, "here you are", {
      trim: trim[0],
      // bb: req.body,
      production_year: production_year,
      delivery_status_type: delivery_status.delivery_type.find(o => o.value == delivery_status_type),
      delivery_havale_type: delivery_status.havale_type.find(o => o.value == delivery_status_value),
      delivery_status_value: delivery_status_value,
      body_color: colors.find(o => o.value == body_color_value),
      interior_color: colors_interior.find(o => o.value == interior_color_value),
      body_status: body_status.find(o => o.value == body_status_value),
      payment_type: payment_type.find(o => o.value == payment_type_value),
      payment_total_price: payment_total_price,
      installment_total_price: installment_total_price,
      installment_prepaid1: installment_prepaid1,
      installment_part_price: installment_part_price,
      installment_number: installment_number.find(o => o.value == installment_number_value),
      installment_month: installment_month.find(o => o.value == installment_month_value),
      installment_delivery: installment_delivery.find(o => o.value == installment_delivery_days_value),
      desc: desc


    })
  } catch (error) {
    logger.error({ event: "HTTP GET COLORS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});


// ############################################
// ############################################
// ############################################
router.get("/getad/:carAdId", authenticate, aggAdder, queryBuilder, async (req, res) => {

  try {


    let { phoneNumber, name, payment } = req.query;


    payment = (payment == undefined) ? "" : payment
    name = (name == undefined) ? "" : name
    phoneNumber = (phoneNumber == undefined) ? "" : phoneNumber

    // {
    //       $match: {
    //         "user.phoneNumber": { $regex: phoneNumber }
    //       }
    //     },
    //     {
    //       $match: {
    //         "user.name": { $regex: name }
    //       }
    //     },
    //     {
    //       $match: {
    //         "payment_type.text": { $regex: payment }
    //       }
    //     }

    let carId = new mongodb.ObjectId(req.params.carAdId);
    let aggregation = [
      // {
      //   $match: {
      //     "_id": new mongodb.ObjectId(req.user.id)
      //   }
      // },
      {
        $unwind: {
          path: "$registeredCarAds"
        }
      },
      req.statusAggregation,
      {
        $match: {
          "registeredCarAds._id": carId
        }
      },
      {
        $set: {
          can_edit: { $eq: ["$_id", new mongodb.ObjectId(req.user.id)] }
        }
      },
      {
        $project: {
          _id: 0,
          can_edit: 1,
          registeredCarAds: 1
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$registeredCarAds",
              "$$ROOT"
            ]
          }
        }
      },
      {
        $project: {
          registeredCarAds: 0
        }
      },
    ];



    let total = -1;

    let totalAgg = [...aggregation, {
      $count: "total"
    }]

    total = await db.aggregate("users", totalAgg);


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

    const ads = await db.aggregate("users", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { ads: ads, total: total.length > 0 ? total[0].total : 0 })
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});



// ############################################
// ############################################
// ############################################
router.get("/getMyAds", authenticate, aggAdder, queryBuilder, async (req, res) => {

  try {


    let { phoneNumber, name, payment } = req.query;

    payment = (payment == undefined) ? "" : payment
    name = (name == undefined) ? "" : name
    phoneNumber = (phoneNumber == undefined) ? "" : phoneNumber

    // {
    //       $match: {
    //         "user.phoneNumber": { $regex: phoneNumber }
    //       }
    //     },
    //     {
    //       $match: {
    //         "user.name": { $regex: name }
    //       }
    //     },
    //     {
    //       $match: {
    //         "payment_type.text": { $regex: payment }
    //       }
    //     }


    let aggregation = [
      {
        $unwind: {
          path: "$registeredCarAds"
        }
      },
      req.statusAggregation,
      {
        $set: {
          can_edit: { $eq: ["$_id", new mongodb.ObjectId(req.user.id)] }
        }
      },
      {
        $match: {
          _id: new mongodb.ObjectId(req.user.id)
        }
      },
      {
        $project: {
          _id: 0,
          can_edit: 1,
          registeredCarAds: 1,
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$registeredCarAds",
              "$$ROOT"
            ]
          }
        }
      },
      {
        $project: {
          registeredCarAds: 0,
        }
      },
      req.userProjection,
      {
        $sort: {
          updatedAt: -1
        }
      }
    ];



    // // If user is admin
    // if (req.user.role.name != "admin") {
    //   aggregation.push({
    //     $match: {
    //       "status.value": 100 // motasher shode
    //     }
    //   });

    // }


    let total = -1;

    let totalAgg = [...aggregation, {
      $count: "total"
    }]

    total = await db.aggregate("users", totalAgg);


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

    const ads = await db.aggregate("users", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { ads: ads, total: total.length > 0 ? total[0].total : 0 })
  } catch (error) {
    logger.error({ event: "HTTP GET Ads ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});

// ############################################
// ############################################
// ############################################
router.get("/getAds", authenticate, aggAdder, queryBuilder, async (req, res) => {

  try {


    let { phoneNumber, name, payment } = req.query;

    payment = (payment == undefined) ? "" : payment
    name = (name == undefined) ? "" : name
    phoneNumber = (phoneNumber == undefined) ? "" : phoneNumber

    // {
    //       $match: {
    //         "user.phoneNumber": { $regex: phoneNumber }
    //       }
    //     },
    //     {
    //       $match: {
    //         "user.name": { $regex: name }
    //       }
    //     },
    //     {
    //       $match: {
    //         "payment_type.text": { $regex: payment }
    //       }
    //     }


    let aggregation = [
      {
        $unwind: {
          path: "$registeredCarAds"
        }
      },
      req.statusAggregation,
      {
        $set: {
          can_edit: { $eq: ["$_id", new mongodb.ObjectId(req.user.id)] }
        }
      },
      {
        $project: {
          _id: 0,
          can_edit: 1,
          registeredCarAds: 1,
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$registeredCarAds",
              "$$ROOT"
            ]
          }
        }
      },
      {
        $project: {
          registeredCarAds: 0,
        }
      },
      req.userProjection,
      {
        $sort: {
          updatedAt: -1
        }
      }
    ];



    // // If user is admin
    // if (req.user.role.name != "admin") {
    //   aggregation.push({
    //     $match: {
    //       "status.value": 100 // motasher shode
    //     }
    //   });

    // }


    let total = -1;

    let totalAgg = [...aggregation, {
      $count: "total"
    }]

    total = await db.aggregate("users", totalAgg);


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

    const ads = await db.aggregate("users", aggregation);

    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { ads: ads, total: total.length > 0 ? total[0].total : 0 })
  } catch (error) {
    logger.error({ event: "HTTP GET Ads ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});





// ############################################
// ############################################
// ############################################
router.post("/changeStatus", authenticate, authorize("admin"), queryBuilder, async (req, res) => {


  const { id, status } = req.body;

  let statues = await loadAdStatus();

  db.update('users', {
    "registeredCarAds._id": new mongodb.ObjectId(id)
  }, {
    $set: {
      [`registeredCarAds.$.status`]: statues.find(o => o.value == status),
    },
    $push: {
      [`status_changes_log`]: {
        $each: [{
          user_id: req.user.id,
          target_status: status,
          changed_at: new Date()
        }]
      }

    }
  }, {
    upsert: false
  })
    .then((r) => {
      logger.debug({ message: "Car ads changed status successfully", reqbody: req.body, "s": statues.find(o => o.value.toString() == status) });


      return response_handler.okResponse(res, "Car Ads changed successfully", { "s": statues.find(o => o.value.toString() == status) })

    })
    .catch((e) => {
      logger.error({ event: "Error in Car Ad changing status ", reqbody: req.body, error: e?.message });
      return response_handler.errorResponse(res, "Error in Car Ad status", req.body)

    });



});

// ############################################
// ############################################
// ############################################
router.put("/changeStatus/:targetAdId/:targetStatus", authenticate, authorize("admin"), queryBuilder, async (req, res) => {


  let statuses = await loadAdStatus();
  db.update('users', {
    "registeredCarAds._id": new mongodb.ObjectId(req.params.targetAdId)
  }, {
    $set: {
      [`registeredCarAds.$.status`]: statuses.find(o => o.value == req.params.targetStatus),
    },
    $push: {
      [`status_changes_log`]: {
        $each: [{
          user_id: req.user.id,
          target_status: req.params.targetStatus,
          changed_at: new Date()
        }]
      }

    }
  }, {
    upsert: false
  })
    .then((r) => {
      logger.debug({ message: "Car ads changed status successfully", reqbody: req.body, "s": statuses.find(o => o.value.toString() == req.params.targetStatus) });


      return response_handler.okResponse(res, "Car Ads changed successfully", { "s": statuses.find(o => o.value.toString() == req.params.targetStatus) })

    })
    .catch((e) => {
      logger.error({ event: "Error in Car Ad changing status ", reqbody: req.body, error: e?.message });
      return response_handler.errorResponse(res, "Error in Car Ad status", req.body)

    });



});



// ############################################
// ############################################
// ############################################
router.get("/deleteAd/:targetAdId", authenticate, queryBuilder, async (req, res) => {


  let statues = await loadAdStatus();
  db.update('users', {
    "_id": req.user.id,
    "registeredCarAds._id": req.params.targetAdId
  }, {
    $set: {
      [`registeredCarAds.$.status`]: statues.find(o => o.value == req.params.targetStatus),
    },
    $push: {
      [`status_changes_log`]: {
        $each: [{
          user_id: req.user.id,
          target_status: req.params.targetAdId
        }]
      }

    }
  }, {
    upsert: false
  })
    .then((r) => {
      logger.debug({ message: "Car ads changed status successfully", reqbody: req.body });


      return response_handler.okResponse(res, "Car Ads changed successfully", {})

    })
    .catch((e) => {
      logger.error({ event: "Error in Car Ad changing status ", reqbody: req.body, error: e?.message });
      return response_handler.errorResponse(res, "Error in Car Ad status", req.body)

    });



});



// ############################################
// ############################################
// ############################################
router.get("/adRequest/:targetAdId", authenticate, queryBuilder, async (req, res) => {


  let statues = await loadAdStatus();
  let user = await User.findById(req.user.id);
  db.update('users', {
    "registeredCarAds._id": new mongodb.ObjectId(req.params.targetAdId)
  }, {
    // $set: {
    //   [`registeredCarAds.$.status`]: statues.find(o => o.value == req.params.targetStatus),
    // },
    $push: {
      [`registeredCarAds.$.requests`]: {
        $each: [{
          buyer: {
            id: new mongodb.ObjectId(req.user.id),
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          request_status: statues.find(o => o.value == 0),
          request_at: new Date()
        }]
      }

    }
  }, {
    upsert: true
  })
    .then((r) => {
      logger.debug({ message: "Ad request registered successfully", result: r });

      return response_handler.okResponse(res, "Ad request registered successfully", { result: r })

    })
    .catch((e) => {
      logger.error({ event: "Error in Car Ad changing status ", reqbody: req.body, error: e?.message });
      return response_handler.errorResponse(res, "Error in Car Ad status", req.body)

    });



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
