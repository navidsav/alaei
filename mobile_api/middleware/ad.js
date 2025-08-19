

const aggAdder = (req, res, next) => {

    if (req.user && req.user.role && req.user.role.name != "admin") {
        req.statusAggregation = {
            $match: {
                $or: [
                    {
                        "status.value": 100 // motasher shode
                    },
                    {
                        "_id": req.user.id
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
            $project: {
                s: 0
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