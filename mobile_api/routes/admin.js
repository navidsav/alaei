
const express = require("express");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const responseHandler = require("./response_handler");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const cityModule = require("../../common/admin/city")
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
router.post("/generateReferralCode", authorize("admin", "operator"), async (req, res) => {

  const { city, agencyCode, role } = req.body;

  let agencies = await agency.loadAgencies();
  let cities = await cityModule.loadCities();

  if (role == "admin" && req.user.role.name != "admin")
    return responseHandler.nokResponse(res, "You are not authorized!", {})


  if (!role)
    return responseHandler.nokResponse(res, "Please select the role!", {})


  if (agencies.findIndex(o => o.value == agencyCode) < 0)
    return responseHandler.nokResponse(res, "Please select the agency!", {})


  if (cities.findIndex(o => o.value == city) < 0)
    return responseHandler.nokResponse(res, "Please select the city!", {})


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
    agencyCode: agencies.find(o => o.value == agencyCode).title,
    cityName: cities.find(o => o.value == city).title, //get city name
    personIndex: count
  });

  let user = await User.findById(req.user.id);
  let ref_code = await db.update(
    'referral_code',
    { code: code }, // match by unique code
    {
      $set: {
        code: code,
        role: role.toLowerCase(),
        updatedAt: new Date(),
        owner: {
          id: new mongodb.ObjectId(req.user.id),
          phoneNumber: user.phoneNumber,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
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
router.post("/getNetwork/:userID", authorize("admin", "operator"), async (req, res) => {


  let userId = req.params.userID;

  try {

    if (req.user.role.name != "admin") {
      userId = req.user.id;
    }


    let aggregation = [
      {
        $lookup: {
          from: "referral_code",
          localField: "referralCode",
          foreignField: "code",
          as: "ref_info"
        }
      },
      { $unwind: "$ref_info" },
      {
        $addFields: {
          referredBy: "$ref_info.owner"
        }
      },
      {
        $match: {
          "referredBy.id": new mongodb.ObjectId(userId)
        }
      }

    ];


    const users = await db.aggregate("users", aggregation);

    let referredBy = {};
    if (users.length > 0) {
      referredBy = users[0].referredBy;
    }

    // Respond with the car details
    return responseHandler.okResponse(res, "here you are", { referredUsers: users, referredBy: referredBy })

  }
  catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    return responseHandler.errorResponse(res, "Server error", { error: error?.message })
  }

})



// ############################################
// ############################################
// ############################################
router.get("/getCodes", authorize("admin", "operator"), queryBuilder, async (req, res) => {

  try {

    notUsedCodesAgg = [
      {
        $lookup: {
          from: "users",
          localField: "code",
          foreignField: "referralCode",
          as: "users"
        }
      },
      {
        $match: {
          users: {
            $size: 0
          }
        }
      },
      {
        $project: {
          "users": 0
        }
      }, {
        $sort: {
          _id: -1
        }
      }];

    if (req.user.role.name != "admin") {
      notUsedCodesAgg.push({
        $match: {
          "owner.id": new mongodb.ObjectId(req.user.id)
        }
      });
    }


    const not_used_codes = await db.aggregate("referral_code", notUsedCodesAgg);


    let usedCodesAgg = [
      {
        $lookup: {
          from: "users",
          localField: "code",
          foreignField: "referralCode",
          as: "users"
        }
      },
      {
        $unwind: {
          path: "$users"
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$users", "$$ROOT"]
          }
        }
      },
      {
        $project: {
          username: 1,
          phoneNumber: 1,
          firstName: 1,
          lastName: 1,
          referralCode: 1,
          role: 1,
          owner: 1,
          updatedAt: 1
        }
      }
    ];


    if (req.user.role.name != "admin") {
      usedCodesAgg.push({
        $match: {
          "owner.id": new mongodb.ObjectId(req.user.id)
        }
      });
    }


    const used_codes = await db.aggregate("referral_code", usedCodesAgg)





    return responseHandler.okResponse(res, "Here you are!", {
      used: used_codes,
      not_used: not_used_codes
    })


  } catch (error) {
    console.error(error)
    return responseHandler.errorResponse(res, "Server error", {})
  }

});




// ############################################
// ############################################
// ############################################
router.get("/getAdRequests", authenticate, authorize("admin"), queryBuilder, async (req, res) => {

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
        $unwind: {
          path: "$registeredCarAds"
        }
      },
      {
        $project: {
          registeredCarAds: 1
        }
      },

      {
        $replaceRoot: {
          newRoot: "$registeredCarAds"
        }
      },
      {
        $unwind: {
          path: "$requests"
        }
      },
      {
        $sort: {
          "requests.request_at": -1
        }
      },
      {
        $match: {
          "requests.request_status.value": 0 // Dar entezar barresi
        }
      },
      {
        $project: {
          seller: "$user",
          buyer: "$requests.buyer",
          request_at: "$requests.request_at"
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

    const adRequests = await db.aggregate("users", aggregation);

    // Respond with the car details
    return responseHandler.okResponse(res, "here you are", { ad_requests: adRequests, total: total.length > 0 ? total[0].total : 0 })
  } catch (error) {
    logger.error({ event: "HTTP GET BRANDS ERROR ", error: error?.message })
    responseHandler.errorResponse(res, "Server error", error)
  }
});




mongo(config.DB_URI, config.MOBILE_DB_NAME)
  .then(async (DB) => {
    db = DB;








  })
  .catch((e) => {
    logger.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message })

  });



module.exports = router;
