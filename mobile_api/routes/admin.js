
const express = require("express");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const responseHandler = require("./response_handler");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const cities = require("../../common/admin/city")
const roles = require("../../common/admin/role")
const queryBuilder = require("../../common/query")



const logger = require("../../common/logger")
const config = require("../../config.json");
let db = {};

const router = express.Router();

const generateCode = require("../../common/code_generator");
const agency = require("../../common/admin/agency");



// ############################################
// ############################################
// ############################################

router.post("/generateReferralCode", async (req, res) => {

  const { city, agencyCode, role } = req.body;

  if (!role)
    return responseHandler.nokResponse(res, "Please select the role!", {})


  // در لحظه ساخت یک فرد جدید
  let update = await db.update('referral_code_counter',
    { year: new Date().getFullYear(), city: city, agencyCode: agencyCode },
    { $inc: { count: 1 } },
    {
      upsert: true, returnDocument: 'after'
    })

  let newCount = await db.aggregate("referral_code_counter", [
    {
      $match: { year: new Date().getFullYear(), city: city, agencyCode: agencyCode },
    }, {
      $sort: {
        count: -1
      }
    },
    {
      $limit: 1
    }

  ])


  let count = -1;
  if (newCount[0]) {
    count = newCount[0].count
  }




  const code = generateCode({
    year: newCount[0].year,
    agencyCode: agency.find(o => o.value == agencyCode).title,
    cityName: cities.find(o => o.value == city).title, //get city name
    personIndex: count
  });

  let ref_code = await db.update(
    'referral_code',
    { code: code }, // match by unique code
    {
      $set: {
        code: code,
        role: role
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  );


  return responseHandler.okResponse(res, "Code generated", { code: code, role: role })

})


// ############################################
// ############################################
// ############################################
router.get("/getCodes", async (req, res) => {

  try {

    const not_used_codes = await db.aggregate("referral_code", []);

    const used_codes = await db.aggregate("users", [
      {
        $match: {
          referralCode: { $ne: null }
        }
      },
      {
        $project: {
          username: 1,
          phoneNumber: 1,
          firstName: 1,
          lastName: 1,
          referralCode: 1,
          role: 1
        }
      }
    ])


    return responseHandler.okResponse(res, "Here you are!", {
      used: used_codes,
      not_used: not_used_codes
    })


  } catch (error) {
    console.error(error)
    return responseHandler.errorResponse(res, "Server error", {})
  }

});



mongo(config.DB_URI, config.MOBILE_DB_NAME)
  .then(async (DB) => {
    db = DB;








  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message })

  });



// ############################################
// ############################################
// ############################################
router.get("/getAds", authenticate, authorize("admin"), queryBuilder, async (req, res) => {

  try {

    let { phoneNumber, name, payment, status } = req.query;

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
        $match: {
          "registeredCarAds.status.value": 0 // dar entezar e barrresi
        }
      },
      {
        $unwind: {
          path: "$registeredCarAds"
        }
      },
      {
        $project: {
          _id: 0,
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
      }
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
    return responseHandler.okResponse(res, "here you are", { ads: ads, total: total[0] })
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    responseHandler.errorResponse(res, "Server error", error)
  }
});


module.exports = router;
