const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/project");
const settingsRoutes = require("./routes/settings");

const app = express();

const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoDefaultDatabase = process.env.MONGO_DEFAULT_DATABASE;
const mongoAddress = process.env.MONGO_ADDRESS;

console.log(`MongoDB User: ${mongoUser}`);
console.log(`MongoDB Password: ${mongoPassword}`);
console.log(`Default Database: ${mongoDefaultDatabase}`);

app.use(bodyParser.json()); // application/json 데이터 처리 restAPI에서는 요청 응답 다 json할거라서
app.use(
  multer({
    storage: multer.memoryStorage(),
  }).single("file")
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.get("/", (req, res, next) => {
  res.send("hello");
});

app.use("/auth", authRoutes);
app.use("/project", projectRoutes);
app.use("/settings", settingsRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500; // 상태코드 기본값 500
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    // messages데이터베이스에 연결 (.net/"db명")
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_ADDRESS}/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`
  )
  .then((result) => {
    app.listen(process.env.PORT || 8080, () => {
      console.log("connected");
    });
  })
  .catch((err) => {
    console.log(err);
  });
