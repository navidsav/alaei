const express = require("express");
const MelipayamakApi = require('melipayamak')
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../../config.json")
const moment = require('moment');
const responseHandler = require("./response_handler");
const authMiddleware = require("../middleware/auth");
const logger = require("../../common/logger");
const redis = require("redis");
const { json } = require("body-parser");
const response_handler = require("./response_handler");
const generateCode = require("../../common/code_generator")

const redis_client = redis.createClient({
  url: config.REDIS_URI,
  legacyMode: true
});

const username = config.SMS_PANEL_USERNAME;
const password = config.SMS_PANEL_PASSWORD;
const api = new MelipayamakApi(username, password);
const sms = api.sms();


const router = express.Router();


const generateVerifyCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};



router.get("/getUserId", authMiddleware, async (req, res) => {

  if (!req.user) {
    return responseHandler.nokResponse(res, `Login first please!`,);
  }
  // Check if user exists
  const user = await User.findById(req.user.id);

  //TODO: the reponse can be attacked and fuzzed :-(
  if (!user) return responseHandler.nokResponse(res, `Login first please!`);


  return responseHandler.okResponse(res, { user_id: req.user.id });

});


// ############################################
// ############################################
// ############################################
router.post("/sendsms", async (req, res) => {

  try {
    const { MobileNumber } = req.body;

    if (!MobileNumber) {
      return responseHandler.forbiddenResponse(res, "Mobile number is required", {})
    }

    // Check if the user exists 
    const user = await User.findOne({ "phoneNumber": MobileNumber });

    if (!user) {
      // User found with 'complete' status, now update verification code and date
      const generatedVerifyCode = generateVerifyCode();
      const verificationDate = moment().toDate();



      const newuser = new User({ phoneNumber: MobileNumber, verificationCode: generatedVerifyCode, verificationDate: verificationDate });

      await newuser.save();

      // Send the SMS using Melipayamak API
      sms.send(MobileNumber, "", `کد تایید ثبت نام شما در اتوعلاپی : ${generatedVerifyCode}`).then(resw => {
        //RecId or Error Number 
        return responseHandler.okResponse(res, "SMS sent successfully", {})
      }).catch(err => {
        return responseHandler.nokResponse(res, "Error sending SMS", {})
        //
      })
      sms.sendByBaseNumber(generatedVerifyCode, MobileNumber, config.SMS_PANEL_REGISTER_TEXT_BODY_ID)
        .then(() => {
          return responseHandler.okResponse(res, "SMS sent successfully", {})

        })
        .catch((error) => {
          logger.error({ event: "Error sending SMS:", error: error?.message });
          return responseHandler.nokResponse(res, "Error sending SMS", {})

        });
    }
    else if (user && user.status !== 'complete') {
      // Update the user's verification code and verification date
      const generatedVerifyCode = generateVerifyCode();
      const verificationDate = moment().toDate();
      user.verificationCode = generatedVerifyCode;
      user.verificationDate = verificationDate;
      await user.save();
      sms.send(MobileNumber, "", `کد تایید ثبت نام شما در اتوعلاپی : ${generatedVerifyCode}`).then(resw => {
        //RecId or Error Number 
        return responseHandler.okResponse(res, "SMS sent successfully", {})
      }).catch(err => {
        return responseHandler.nokResponse(res, "Error sending SMS", { err: err.message })
        //
      })
      sms.sendByBaseNumber(generatedVerifyCode, MobileNumber, config.SMS_PANEL_REGISTER_TEXT_BODY_ID)
        .then(() => {
          return responseHandler.okResponse(res, "SMS sent successfully", {})
        })
        .catch((error) => {
          logger.error({ event: "Error sending SMS:", error: error?.message });
          return responseHandler.nokResponse(res, "Error sending SMS", {})

        });

    }
    else {
      return responseHandler.nokResponse(res, "The user with this number has been registered", {})


    }

  } catch (error) {
    logger.error({ event: "Error Server:", error: error?.message });

    return responseHandler.errorResponse(res, "Server error", {})

  }
});


// ############################################
// ############################################
// ############################################

router.post("/register", async (req, res) => {
  try {

    const { FirstName, LastName, Password, MobileNo, NationalCode, ReferralCode } = req.body;
    const user = await User.findOne({ "phoneNumber": MobileNo });
    if (!(FirstName && LastName && NationalCode && Password && MobileNo && ReferralCode)) {
      return responseHandler.nokResponse(res, "one of ReferralCode,FirstName,LastName,NationalCode,Password,MobileNo are null", {})
    }

    if (user && user.status == "phone_verified") {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(Password + salt, 10);
      user.username = user.phoneNumber
      user.firstName = FirstName
      user.nationalCode = NationalCode
      user.lastName = LastName
      user.password = hashedPassword
      user.referralCode = ReferralCode
      user.salt = salt
      user.status = 'complete'
      user.save()

      const token = jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: "365d" });


      return responseHandler.okResponse(res, "User saved successfully", { token: token })



    }
    else {
      return responseHandler.nokResponse(res, "User not found or verified by phone number!", {})

    }
  } catch {
    console.error("Server error:", error);
    return responseHandler.errorResponse(res, "Server error", {})

  }

});



// ############################################
// ############################################
// ############################################
router.post("/VerificationMobileNumber", async (req, res) => {
  try {

    const { MobileNumber, Code } = req.body;
    const user = await User.findOne({ "phoneNumber": MobileNumber });

    if (user) {
      const timeDifferenceInSeconds = moment().diff(moment(user.verificationDate), 'seconds')
      console.log(timeDifferenceInSeconds)
      if (timeDifferenceInSeconds < 3 * 60) {
        if (user.verificationCode == Code) {
          user.status = 'phone_verified';
          user.save()
          return responseHandler.okResponse(res, "Code is correct")

        }
        else {
          return responseHandler.nokResponse(res, "Code is wrong")

        }

      }
      else {
        return responseHandler.nokResponse(res, "It is too late")

      }

    }
    else {
      return responseHandler.nokResponse(res, "not found this user")

    }

  } catch {
    console.error("Server error:", error);
    return responseHandler.errorResponse(res, "Server error")

  }

});



// ############################################
// ############################################
// ############################################
router.post("/ValidationSMSCode", async (req, res) => {
  try {

    const { MobileNumber, Code } = req.body;
    const user = await User.findOne({ "phoneNumber": MobileNumber });
    if (user) {
      const timeDifferenceInSeconds = moment().diff(moment(user.verificationDate), 'seconds')
      if (timeDifferenceInSeconds < 3 * 60) {
        if (user.verificationCode == Code) {


          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(Code + salt, 10);
          // Save user
          user.salt = salt;
          user.password = hashedPassword;
          await user.save();

          return responseHandler.okResponse(res, "رمز عبور شما به کد پیامک شده تغییر یافت!")

        }
        else {
          return responseHandler.nokResponse(res, "Code is wrong")

        }

      }
      else {
        return responseHandler.nokResponse(res, "It is too late")

      }

    }
    else {
      return responseHandler.nokResponse(res, "not found this user")

    }

  } catch {
    console.error("Server error:", error);
    return responseHandler.errorResponse(res, "Server error")

  }

});




// LOGIN 
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;


    // Check if user exists
    const user = await User.findOne({ username: new RegExp(username, 'i') });
    if (!user) return responseHandler.nokResponse(res, "Invalid credentials", {});

    // Compare passwords
    const isMatch = await bcrypt.compare(password + user.salt, user.password);
    if (!isMatch) return responseHandler.nokResponse(res, "Invalid credentials", {});

    // Generate JWT
    const token = jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: "365d" });


    const maxAge = 31536000000;
    res.cookie('token', token, {
      httpOnly: false,       // Helps prevent XSS
      secure: false,         // Use true if using HTTPS
      sameSite: 'None',   // or 'Lax' or 'None' (use 'None' if cross-site)
      maxAge: maxAge       // 1 year in ms
    });

    redis_client.set(`online:${user._id}`, token, 'EX', maxAge); // 1-hour expiry

    return response_handler.okResponse(res, "Successfully logged in!", { token: token, user: { id: user._id, username: user.username.toLowerCase(), fullname: `${user.firstName} ${user.lastName}`, is_operator: (user.referralCode && user.referralCode.length > 1) } })
    res.json({ token, user: { id: user._id, username: user.username.toLowerCase(), fullname: `${user.firstName} ${user.lastName}` }, IsSuccessful: true });
  } catch (error) {
    responseHandler.errorResponse(res, "Server error", {})
    console.log(error)
  }
});



router.get("/amIOnline", authMiddleware, async (req, res) => {
  const isOnline = await redis_client.exists(`online:${req.user.id}`);

  const user = await User.findById(req.user.id);


  responseHandler.okResponse(res, "Is online", { is_online: isOnline, is_operator: (user.referralCode && user.referralCode.length > 1) })


})


// ############################################
// ############################################
// ############################################
// RESET PASSWORD
router.post("/resetpassword", authMiddleware, async (req, res) => {
  try {

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Check if user exists
    const user = await User.findById(req.user.id);

    //TODO: the reponse can be attacked and fuzzed :-(
    if (!user) return responseHandler.nokResponse(res, `Login first please!`);

    // Compare passwords
    const isMatch = await bcrypt.compare(currentPassword + user.salt, user.password);

    if (!isMatch)
      return responseHandler.nokResponse(res, `Invalid credentials!`);

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

    console.log(error)
    return responseHandler.errorResponse(res, "Server error", {})

  }
});




// ############################################
// ############################################
// ############################################
router.post("/SetUserNotificationToken", authMiddleware, async (req, res) => {
  try {
    const { TokenId } = req.body;

    if (!TokenId) {
      return responseHandler.forbiddenResponse(res, "Token ID is required", {})
    }

    // Check if the user exists 
    const user = await User.findById(req.user.id);

    if (user) {


      const existingToken = await User.findOne({ "pushNotificationTokens.tokenId": TokenId });
      if (existingToken) {
        return responseHandler.okResponse(res, "Token is already registered!", {});
      }


      const result = await User.updateOne(
        { _id: req.user.id },
        { $pull: { pushNotificationTokens: { type: "Firebase" } } });
      console.log('Token removed:', result);

      await user.save();
      user.pushNotificationTokens.push({
        "type": "Firebase",
        "tokenId": TokenId
      })
      await user.save();
      return responseHandler.okResponse(res, "Successful User push notification token registeration", {})

    }
    else {
      return responseHandler.nokResponse(res, "User push notification token registeration error", {})


    }

  } catch (error) {
    console.error("Server error:", error);
    return responseHandler.errorResponse(res, "Server error", {})

  }
});




// ############################################
// ############################################
// ############################################

router.post("/generateReferalCode", authMiddleware, async (req, res) => {

  const { city, agencyCode } = req.body;

  // در لحظه ساخت یک فرد جدید
  // const counter = await db.collection('counters').findOneAndUpdate(
  //   { year: 2025, month: 8, agencyCode: 'AL01' },
  //   { $inc: { count: 1 } },
  //   { upsert: true, returnDocument: 'after' }
  // );

  // const personIndex = counter.value.count;



  const code = generateCode({
    agencyCode: agencyCode,
    cityName: city,
    personIndex: 22
  });

  return responseHandler.okResponse(res, "Code generated", { code: code })

})

// ############################################
// ############################################
// ############################################
router.post("/ForgotPassWord", async (req, res) => {
  try {
    const { MobileNumber } = req.body;

    if (!MobileNumber) {
      return responseHandler.forbiddenResponse(res, "Mobile number is required", {})
    }

    // Check if the user exists 
    const user = await User.findOne({ "phoneNumber": MobileNumber });

    if (!user) {
      return responseHandler.nokResponse(res, "The user not found!", {})

    }
    else {

      // Update the user's verification code and verification date
      const generatedVerifyCode = generateVerifyCode();
      const verificationDate = moment().toDate();
      user.verificationCode = generatedVerifyCode;
      user.verificationDate = verificationDate;
      await user.save();
      sms.sendByBaseNumber(generatedVerifyCode, MobileNumber, config.SMS_PANEL_FORGOT_PASS_TEXT_BODY_ID)
        .then(() => {
          return responseHandler.okResponse(res, "SMS sent successfully", {})
        })
        .catch((error) => {
          logger.error({ event: "Error sending SMS:", error: error?.message });
          return responseHandler.errorResponse(res, "Error sending SMS", {})

        });



    }

  } catch (error) {
    logger.error({ event: "Error Server:", error: error?.message });

    return responseHandler.errorResponse(res, "Server error", {})

  }

});

router.delete('/logout', authMiddleware, async (req, res) => {
  const isOnline = await redis_client.del(`online:${req.user.id}`);
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'None' });

  return responseHandler.okResponse(res, 'Logged out', {});
});

// (async () => {

//   setTimeout(async () => {
//     const user = await User.findOne({ username: new RegExp('yasser', 'i') });
//   }, 5000);
//   let ww = await bcrypt.compare('123456' + '$2a$10$AwL6ckjaE3sdxJMU9ZN8vO', '$2a$10$JFuHS0yyXQtJ25ivyFtgr.3WxEu7HVPZ6vY1CUwarj./PCtC8/44W')
//   let wwqq = "Asda";
// })()

module.exports = router;
