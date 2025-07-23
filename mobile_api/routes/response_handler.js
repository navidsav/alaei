

module.exports = {
    "okResponse": (res, message, returnObj) => {

        return res.status(200).json({ IsSuccessful: true, message: message, returnObj: returnObj });

    },
    "nokResponse": (res, message, returnObj) => {

        return res.status(200).json({ IsSuccessful: false, message: message, returnObj: returnObj });

    },
    "errorResponse": (res, message, returnObj) => {
        return res.status(500).json({ IsSuccessful: false, message: message, returnObj: returnObj });

    },
    "forbiddenResponse": (res, message, returnObj) => {
        return res.status(400).json({ IsSuccessful: false, message: message, returnObj: returnObj });

    },
}