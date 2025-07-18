const express = require('express')
const config = require('../config.json');
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const carRoutes = require("./routes/cars");
const constantRoutes = require("./routes/constant");
const bodyParser = require("body-parser");
const authMiddleware = require("./middleware/auth");




const app = express()
const port = config.MOBILE_API_PORT
app.use(bodyParser.json());

mongoose.connect(`${config.DB_URI}/${config.MOBILE_DB_NAME}?authSource=admin`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


app.use("/v2/car", authMiddleware, carRoutes);
app.use("/v2/user", authRoutes);
app.use("/v2/brand", authMiddleware, carRoutes);
app.use("/v2/carModel", authMiddleware, carRoutes);
app.use("/v2/carModelDetail", authMiddleware, carRoutes)
app.use("/v2/constant", authMiddleware, constantRoutes)



app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "You have accessed a protected route", user: req.user });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})