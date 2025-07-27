const express = require("express");
const ColorModel = require("../models/ColorModel");
const response_handler = require("./response_handler");
const logger = require("../../common/logger");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const multer = require('multer');
const authMiddleware = require("../middleware/auth")


const config = require("../../config.json");
const body_status = require("../../common/car/body_status");
const colors = require("../../common/car/colors");
const colors_interior = require("../../common/car/colors_interior");
const queryBuilder = require("../../common/query")

const router = express.Router();

let db = {};



// ############################################
// ############################################
// ############################################

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
router.post("/add", authMiddleware, upload.array('images', 10), async (req, res) => {

  try {

    let {
      trim_id,
      production_year,
      delivery_status_type,
      delivery_status_value,
      body_color_value,
      interior_color_value,
      body_status_value,
      payment_type,
      payment_total_price,
      installment_number_value,
      installment_delivery_days_value,
      installment_month_value,

    } = req.body;


    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'هیچ تصویری ارسال نشده است' });
    }

    const imageUrls = req.files.map(file => `/cdn/alaei/uploads/${file.filename}`);



    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { bb: req.body, imageUrls: imageUrls })
  } catch (error) {
    logger.error({ event: "HTTP GET COLORS ERROR ", error: error?.message })
    response_handler.errorResponse(res, "Server error", error)
  }
});




const delivery_status = require("../../common/car/delivery_status");
const body_status = require("../../common/car/body_status");
const colors = require("../../common/car/colors");
const colors_interior = require("../../common/car/colors_interior");
const installment_number = require("../../common/car/installment_number");
const installment_month = require("../../common/car/installment_month");
const installment_delivery = require("../../common/car/installment_delivery");
const payment_type = require("../../common/car/payment_type");
router.post("/verify", authMiddleware, async (req, res) => {



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
      installment_number_value,
      installment_delivery_days_value,
      installment_month_value,

    } = req.body;

    let trim = await db.aggregate("carbrands", [
      [
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
      ]
    ])



    // Respond with the car details
    return response_handler.okResponse(res, "here you are", { 
      trim:trim,
      production_year:production_year,
      delivery_status_type:delivery_status.delivery_type.find(o => o.value == delivery_status_type),
      delivery_havele_type:delivery_status.havale_type.find(o => o.value == delivery_status_value),
      body_color: colors.find(o => o.value == body_color_value),
      interior_color: colors_interior.find(o => o.value == interior_color_value),
      body_status : body_status.find(o => o.value == body_status_value),
      payment_type: payment_type.find(o => o.value == payment_type_value),
      payment_total_price:payment_total_price,
      installment_number: installment_number.find(o => o.value == installment_number_value),
      installment_month: installment_month.find(o => o.value == installment_month_value),
      installment_delivery: installment_delivery.find(o => o.value == installment_delivery_days_value),



     })
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
