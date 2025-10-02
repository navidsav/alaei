const mongodb = require("mongodb");

const aggAdder = (req, res, next) => {



    if (req.params.userID && req.user.role && req.user.role.name == "admin") {

        req.userAggregation = {
            $match: {
                _id: new mongodb.ObjectId(req.params.userID)
            }
        }
    }
    else { // dont care (x)
        req.userAggregation = {
            $match: {
                _id: new mongodb.ObjectId(req.user.id)
            }
        };
    }

    if (req.user && req.user.role && req.user.role.name != "admin") {
        req.statusAggregation = {
            $match: {
                $or: [
                    {
                        "registeredCarAds.status.value": 100 // motasher shode
                    },
                    {
                        "_id": new mongodb.ObjectId(req.user.id)
                    }
                ]
            }
        };
        req.userProjection = {
            $project: {
                user: 0
            }
        };
    }
    else {
        req.statusAggregation = {
            $match: {
                $or: [
                    {
                        "registeredCarAds.status.value": 100 // motasher shode
                    },
                    {
                        "registeredCarAds.status.value": 0 // checking
                    },
                ]
            }
        }
        req.userProjection = {
            $project: {
                ss: 0
            }
        };

    }

    // const oldJson = res.json;

    // res.json = function (data) {
    //   console.log(" ************ ", data)
    //   console.log(" user : ", req.user)
    //   // Ensure it's an object before modifying
    //   if (typeof data === 'object' && data && data.returnObj && data.returnObj.ads) {
    //     if (req.user.role.name != "admin") {
    //       data.user = undefined;
    //     }
    //     // data.serverTime = new Date();
    //   }
    //   return oldJson.call(this, data);
    // };

    next();

}

module.exports = {
    aggAdder
}