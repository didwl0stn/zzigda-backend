const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const crypto = require("crypto");

const User = require("../modules/user");

const { format } = require("util");
const { v4: uuidv4 } = require("uuid");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucket = storage.bucket("helloworld-app-410701.appspot.com");

const uploadFile = (req) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(req.file);

      if (
        req.file.mimetype !== "image/png" &&
        req.file.mimetype !== "image/jpg" &&
        req.file.mimetype !== "image/jpeg"
      ) {
        const error = new Error(`wrong mimetype : ${req.file.mimetype}`);
        error.statusCode = 500;
        reject(error);
      }

      const folderName = "userImage/";

      const fileName = folderName + uuidv4() + "_" + req.file.originalname;

      // Create a new blob in the bucket and upload the file data.
      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
      });

      blobStream.on("error", (err) => {
        const error = new Error(err.message);
        error.statusCode = 500;
        reject(error);
      });

      let publicUrl;

      blobStream.on("finish", async (data) => {
        // Create URL for directly file access via HTTP.
        publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );

        try {
          // Make the file public
          await bucket.file(fileName).makePublic();
          resolve(publicUrl);
        } catch (err) {
          const error = new Error(
            `Uploaded the file successfully: ${fileName}, but public access is denied!`
          );
          error.statusCode = 500;
          reject(error);
        }
      });

      blobStream.end(req.file.buffer);
    } catch (err) {
      const error = new Error(
        `Could not upload the file: ${req.file.originalname}. ${err}`
      );
      error.statusCode = 500;
      reject(error);
    }
  });
};

const deleteFile = async (url, next) => {
  try {
    if (!url) {
      // 이미지 URL이 없으면 삭제할 파일이 없으므로 무시합니다.
      return;
    }
    const folderName = "userImage/";
    const fileName = folderName + url.substring(url.lastIndexOf("/") + 1);
    const file = bucket.file(fileName);

    // 파일이 존재하는지 확인한 후 삭제합니다.
    const exists = await file.exists();
    if (exists) {
      await file.delete();
    }
  } catch (err) {
    console.error(err);
    const error = new Error(`Unable to delete file: ${err.message}`);
    error.statusCode = 500;
    next(error);
  }
};

exports.getEditUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("user not found");
      //error.statusCode = 401;
      throw error;
    }

    res.status(200).json({
      user: user,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.patchEditUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const userId = req.params.userId;
    let imageUrl = req.body.imageUrl;
    const email = req.body.email;
    const name = req.body.name;
    const phone = req.body.phone;

    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("user not found");
      //error.statusCode = 401;
      throw error;
    }

    if (req.file) {
      imageUrl = await uploadFile(req);
      console.log("This is imageUrl : ", imageUrl);

      if (user.imageUrl) {
        console.log("this is user imageUrl : ", user.imageUrl);
        await deleteFile(user.imageUrl, next);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { email: email, name: name, phone: phone, imageUrl: imageUrl } },
      { new: true }
    );

    res.status(201).json({
      message: "user updated",
      updatedUser: updatedUser,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
