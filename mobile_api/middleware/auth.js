const jwt = require("jsonwebtoken");
const config = require("../../config")
const User = require("../models/User");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const logger = require("../../common/logger");
const response_handler = require("../routes/response_handler");



module.exports = function (req, res, next) {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), config.JWT_SECRET);
    req.user = decoded;

    let propNames = Object.getOwnPropertyNames(req.body);

    if (propNames.length == 0)
      next();
    else {

      let carIdPropName = propNames.find(prop => prop.toLocaleLowerCase().replace("_", "").replace("-", "").indexOf("carid") >= 0);

      if (carIdPropName) {
        User.aggregate([
          {
            $match: {
              _id: new mongoose.Types.ObjectId(req.user.id),
              "registeredCars._id": new mongoose.Types.ObjectId(req.body[carIdPropName])
              // _id: {
              //   $eq: { $toObjectId: req.user.id }
              // },
              // "registeredCars._id": {
              //   $eq: { $toObjectId: req.body[propName] }
              // }
            }
          },
          {
            $project: {
              "registeredCars": 1
            }
          }
        ]).then(car => {
          if (!car || car.length == 0) {

            logger.error({
              event: "No car, authorization denied AUTHORIZATION auth.js", prams: {
                "user_id": req.user.id,
                "reg.body": req.body,
                "carIdPropName": carIdPropName
              }, car: car
            })

            return response_handler.forbiddenResponse(res, "No car, authorization denied", {
              "user_id": req.user.id,
              "reg.body": req.body,
              "carIdPropName": carIdPropName
            })
          }
          else {
            next()
          }
        }).catch(err => {
          logger.error({ event: " AUTHORIZATION auth.js", error: err?.message })
          return response_handler.forbiddenResponse(res, "Invalid token", {})

        });
      }
      else {
        next();
      }




    }


  } catch (error) {
    logger.error({ event: "SERVER ERROR AUTHORIZATION auth.js", error: error?.message })
    return response_handler.errorResponse(res, "Server Error", error)

  }
};
