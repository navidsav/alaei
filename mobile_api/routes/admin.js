
const express = require("express");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const responseHandler = require("./response_handler");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");
const cities = require("../../common/admin/city")
const roles = require("../../common/admin/role")


const logger = require("../../common/logger")
const config = require("../../config.json");
let db = {};

const router = express.Router();

const generateCode = require("../../common/code_generator")



// ############################################
// ############################################
// ############################################

router.post("/generateReferralCode", async (req, res) => {

  const { city, agencyCode, role } = req.body;

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
    agencyCode: agencyCode,
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

    const codes = await db.aggregate("referral_code", []);

    return responseHandler.okResponse(res, "Here you are!", codes)

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



module.exports = router;
