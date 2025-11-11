
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
const bcrypt = require("bcryptjs");



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
router.get("/getNetwork/:userID", authorize("admin", "operator"), async (req, res) => {


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
      },
      {
        $project: {
          referredBy: 1,
          ref_info: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          phoneNumber: 1,
          role: 1,
          nationalCode: 1,
          _id: 1,
          refferal_code: 1
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

    let { filter } = req.query;


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
        $addFields: {
          _id: "$users._id"
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
      },
      {
        $match: {
          $or: [
            {
              "owner.phoneNumber": {
                $regex: filter,
                $options: "i"
              }
            },
            {
              "owner.firstName": {
                $regex: filter,
                $options: "i"
              }
            },
            {
              "owner.lastName": {
                $regex: filter,
                $options: "i"
              }
            }
          ]
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




    let total = -1;

    let totalAgg = [...usedCodesAgg, {
      $count: "total"
    }]

    total = await db.aggregate("referral_code", totalAgg);


    if (!filter && req.mongoQuery.skip) {

      usedCodesAgg.push({
        $skip: req.mongoQuery.skip
      });
    }
    if (!filter && req.mongoQuery.limit) {
      usedCodesAgg.push({
        $limit: req.mongoQuery.limit
      });
    }

    let datalen = -1;

    let datalenAgg = [...usedCodesAgg, {
      $count: "data_len"
    }]

    datalen = await db.aggregate("referral_code", datalenAgg);


    const used_codes = await db.aggregate("referral_code", usedCodesAgg)





    return responseHandler.okResponse(res, "Here you are!", {
      used: used_codes,
      used_total_len: total.length > 0 ? total[0].total : 0,
      used_data_len: datalen.length > 0 ? datalen[0].data_len : 0,
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


// ############################################
// ############################################
// ############################################
// RESET PASSWORD
router.post("/resetpassword", authenticate, authorize("admin"), async (req, res) => {
  try {

    const { userId, newPassword, confirmNewPassword } = req.body;

    // Check if user exists
    const user = await User.findById(userId);

    //TODO: the reponse can be attacked and fuzzed :-(
    if (!user) return responseHandler.nokResponse(res, `User not found!`);

    // Compare passwords
    // const isMatch = await bcrypt.compare(currentPassword + user.salt, user.password);

    // if (!isMatch)
    //   return responseHandler.nokResponse(res, `Invalid credentials!`);

    if (newPassword != confirmNewPassword)
      return responseHandler.nokResponse(res, `Please correct and retype password!`);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword + salt, 10);
    // Save user
    user.salt = salt;
    user.password = hashedPassword;
    await user.save();

    return responseHandler.okResponse(res, "Password has been changed successfully", {})
  } catch (error) {
    logger.error({ error: error })

    return responseHandler.errorResponse(res, "Server error", {})

  }
});


router.get("/network", authenticate, authorize("admin"), async (req, res) => {

  try {

    let networkAgg = [
      {
        $lookup: {
          from: "users",
          localField: "code",
          foreignField: "referralCode",
          as: "child"
        }
      },
      {
        $project: {
          code: 1,
          parent: "$owner",
          child: {
            $let: {
              vars: {
                c: { $arrayElemAt: ["$child", 0] }
              },
              in: {
                _id: "$$c._id",
                username: "$$c.username",
                firstName: "$$c.firstName",
                lastName: "$$c.lastName"
              }
            }
          }
        }
      }
    ];
    const referralData = await db.aggregate("referral_code", networkAgg);



    const elements = [];
    const addedNodes = new Set();

    for (const doc of referralData) {
      const parent = doc.parent;
      const child = doc.child;

      if (parent && parent.id && !addedNodes.has(parent.id)) {
        elements.push({
          data: {
            id: parent.id,
            label: `${parent.firstName} ${parent.lastName} (${parent.username})`,
            role: doc.role || "parent"
          }
        });
        addedNodes.add(parent.id);
      }

      if (child && child._id && !addedNodes.has(child._id)) {
        elements.push({
          data: {
            id: child._id,
            label: `${child.firstName} ${child.lastName} (${child.username})`,
            role: doc.role || "child"
          }
        });
        addedNodes.add(child._id);
      }

      // حالا edge بین parent و child
      if (parent && parent.id && child && child._id) {
        elements.push({
          data: { source: parent.id, target: child._id }
        });
      }
    }

    const nodes = [];
    const edges = [];

    elements.forEach(doc => {
      if (doc.parent && doc.parent.id) {
        // اضافه کردن parent node
        if (!nodes.some(n => n.data.id === doc.parent.id.toString())) {
          nodes.push({
            data: {
              id: doc.parent.id.toString(),
              label: `${doc.parent.firstName} ${doc.parent.lastName} (${doc.parent.username})`,
              role: "parent"
            }
          });
        }

        // اضافه کردن child node
        if (doc.child && doc.child._id) {
          if (!nodes.some(n => n.data.id === doc.child._id.toString())) {
            nodes.push({
              data: {
                id: doc.child._id.toString(),
                label: `${doc.child.firstName} ${doc.child.lastName} (${doc.child.username})`,
                role: "child"
              }
            });
          }

          // ساخت edge
          edges.push({
            data: {
              source: doc.parent.id.toString(),
              target: doc.child._id.toString()
            }
          });
        }
      }
    });

    const graphData = { nodes, edges };


    return responseHandler.okResponse(res, "Here you are", { graphData: graphData })


  }
  catch (error) {
    logger.error({ error: error })
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
