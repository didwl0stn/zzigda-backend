const { validationResult } = require("express-validator");
const fs = require("fs");

const fileEdit = require("../../util/file");
const Location = require("../../modules/project/location");
const LocationCall = require("../../modules/project/callsheet/locationCall");

const { format } = require("util");
const { v4: uuidv4 } = require("uuid");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucket = storage.bucket("helloworld-app-410701.appspot.com");

const Storyboard = require("../../modules/project/storyboard");

const uploadFile = (req, res, next) => {
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

      const folderName = "locationImage/";

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

const deleteFile = async (url) => {
  try {
    const folderName = "locationImage/";
    const fileName = folderName + url.substring(url.lastIndexOf("/") + 1);
    const file = bucket.file(fileName);

    // 파일 삭제
    await file.delete();
  } catch (err) {
    console.error(err);
    const error = new Error(`Unable to delete file: ${err.message}`);
    error.statusCode = 500;
    next(error);
  }
};

exports.getLocations = (req, res, next) => {
  const projectId = req.params.projectId;

  Location.find({ project: projectId })
    .then((locations) => {
      if (locations.length >= 0) {
        const totalItems = locations.length;
        res.status(200).json({
          locations: locations,
          totalItems: totalItems,
          authority: req.aCode,
        });
      } else {
        const error = new Error("No locations could be found");
        // error.statusCode = 404;
        next(error);
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getAddLocation = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const callsheetId = req.params.callsheetId;
    const aCode = req.aCode;

    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const locations = await Location.find({
      project: projectId,
      callsheet: { $not: { $elemMatch: { $eq: callsheetId } } },
    });

    if (locations.length >= 0) {
      const totalItems = locations.length;

      res.status(200).json({
        locations: locations,
        totalItems: totalItems,
        authority: req.aCode,
      });
    } else {
      const error = new Error("No locations could be found");
      //error.statusCode = 404;
      throw error;
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getLocation = (req, res, next) => {
  const userId = req.userId;
  const locationId = req.params.locationId;

  Location.findById(locationId)
    .then((location) => {
      if (!location) {
        const error = new Error("No location could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ location: location, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createLocation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  let imageUrl;

  if (req.file) {
    imageUrl = await uploadFile(req, res, next);
    console.log("This is imageUrl : ", imageUrl);
  }

  const name = req.body.name;
  const address = req.body.address;
  const scene = req.body.scene;
  const phone = req.body.phone;
  const note = req.body.note;
  const projectId = req.params.projectId;

  const location = new Location({
    imageUrl: imageUrl,
    name: name,
    address: address,
    scene: scene,
    phone: phone,
    note: note,
    project: projectId,
  });

  location
    .save()
    .then((location) => {
      res.status(201).json({
        message: "location created!",
        location: location,
        authority: aCode,
      });
    })
    .catch((err) => {
      console.log(err);
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateLocation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  const locationId = req.params.locationId;
  let imageUrl = req.body.imageUrl;
  const name = req.body.name;
  const address = req.body.address;
  const scene = req.body.scene;
  const phone = req.body.phone;
  const note = req.body.note;

  const location = await Location.findById(locationId);

  if (req.file) {
    imageUrl = await uploadFile(req);
    console.log("This is imageUrl : ", imageUrl);

    if (location.imageUrl) {
      await deleteFile(location.imageUrl);
    }
  }

  Location.findByIdAndUpdate(
    locationId,
    {
      $set: {
        imageUrl: imageUrl,
        name: name,
        address: address,
        scene: scene,
        phone: phone,
        note: note,
      },
    },
    { new: true }
  )
    .then((updatedLocation) => {
      res.status(201).json({
        message: "location updated",
        updatedLocation: updatedLocation,
        authority: aCode,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteLocation = (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  const locationIds = req.body.locationIds;
  const projectId = req.params.projectId;

  Location.find({ _id: { $in: locationIds } })
    .then((locations) => {
      if (locations.length === 0) {
        const error = new Error("Could not find locations to delete");
        //error.statusCode = 404;
        next(error);
      }

      for (const location of locations) {
        if (location.imageUrl) {
          deleteFile(location.imageUrl);
        }
      }
      return Location.deleteMany({ _id: { $in: locationIds } });
    })
    .then((result) => {
      return LocationCall.deleteMany({ location: { $in: locationIds } });
    })
    .then((result) => {
      return Location.find({ project: projectId });
    })
    .then((locations) => {
      res.status(200).json({
        message: "deleting locations complete",
        locations: locations,
        authority: aCode,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
