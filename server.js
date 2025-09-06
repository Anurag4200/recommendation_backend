const express = require("express");
const mongoose = require("mongoose");
const recommendationRoutes = require("./routes/recommendationRoutes");

const app = express();
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/recommendationDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use("/recommendations", recommendationRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));
