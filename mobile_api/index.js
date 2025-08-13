const express = require('express')
const config = require('../config.json');
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const adRoutes = require("./routes/ad");
const constantRoutes = require("./routes/constant");
const bodyParser = require("body-parser");
const { authenticate, authorize } = require("./middleware/auth");
const cookieParser = require('cookie-parser');
const cors = require('cors')


const app = express()
const port = config.MOBILE_API_PORT
app.use(bodyParser.json());
app.use(cookieParser());


const allowedOrigins = [
  'https://auto-gallery-hazel.vercel.app',
  'https://panel.autoalaei.ir'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, false);

    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    if (allowedOrigins.includes(origin) || isLocalhost) {
      callback(null, true);
    } else {
      callback(null, false); // CORS headers will not be set
    }
  },
  credentials: true
}));

mongoose.connect(`${config.DB_URI}/${config.MOBILE_DB_NAME}?authSource=admin`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


app.use((req, res, next) => {


  if (req.user && req.user.role && req.user.role.name != "admin") {
    req.aggregation = [{
      $match: {
        "status.value": 100 // motasher shode
      }
    }]
  }
  else {
    req.aggregation = []
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
});


app.use("/v2/user", authRoutes);
app.use("/v2/constant", authenticate, constantRoutes)
app.use("/v2/ads", adRoutes)
app.use("/admin/v2/", authenticate, authorize("admin"), adminRoutes)




app.get("/api/protected", authenticate, (req, res) => {
  res.json({ message: "You have accessed a protected route", user: req.user });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})