const { validationResult } = require("express-validator");
const fs = require("fs");

const fileEdit = require("../../util/file");
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

      const folderName = "storyboardImage/";

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
    const folderName = "storyboardImage/";
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

const getListFiles = async (req, res, next) => {
  try {
    const [files] = await bucket.getFiles({ prefix: "storyboardImage/" });
    let fileInfos = [];

    files.forEach((file) => {
      const fileName = file.name.split("/").pop();
      fileInfos.push({
        name: fileName,
        url: file.metadata.mediaLink,
      });
    });

    res.status(200).send(fileInfos);
  } catch (err) {
    console.log(err);

    res.status(500).send({
      message: "Unable to read list of files!",
    });
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const fileUrl = req.params.url;
    const folderName = "storyboardImage/";
    const fileName =
      folderName + fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
    const [metaData] = await bucket.file(fileName).getMetadata();
    res.redirect(metaData.mediaLink);
  } catch (err) {
    res.status(500).send({
      message: "Could not download the file. " + err,
    });
  }
};

exports.getStoryboards = (req, res, next) => {
  const projectId = req.params.projectId;

  Storyboard.find({ project: projectId })
    .sort({ scene: 1, cut: 1 })
    .then((storyboards) => {
      if (storyboards.length >= 0) {
        const totalItems = storyboards.length;
        res.status(200).json({
          storyboards: storyboards,
          totalItems: totalItems,
          authority: req.aCode,
        });
      } else {
        const error = new Error("No storyboards could be found");
        //error.statusCode = 404;
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

exports.getStoryboard = (req, res, next) => {
  const storyboardId = req.params.storyboardId;

  Storyboard.findById(storyboardId)
    .then((storyboard) => {
      if (!storyboard) {
        const error = new Error("No storyboard could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ storyboard: storyboard, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createStoryboard = async (req, res, next) => {
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

  const scene = req.body.scene;
  const cut = req.body.cut;
  const video = req.body.video;
  const audio = req.body.audio;
  const projectId = req.params.projectId;

  const storyboard = new Storyboard({
    imageUrl: imageUrl,
    scene: scene,
    cut: cut,
    video: video,
    audio: audio,
    project: projectId,
  });

  storyboard
    .save()
    .then((storyboard) => {
      return Storyboard.find({ project: projectId }).sort({ scene: 1, cut: 1 });
    })
    .then((storyboards) => {
      res.status(201).json({
        message: "storyboard created!",
        storyboard: storyboards,
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

exports.updateStoryboard = async (req, res, next) => {
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

  const storyboardId = req.params.storyboardId;
  const projectId = req.params.projectId;
  let imageUrl = req.body.imageUrl;
  const scene = req.body.scene;
  const cut = req.body.cut;
  const video = req.body.video;
  const audio = req.body.audio;

  const storyboard = await Storyboard.findById(storyboardId);

  if (req.file) {
    imageUrl = await uploadFile(req);
    console.log("This is imageUrl : ", imageUrl);

    if (storyboard.imageUrl) {
      await deleteFile(storyboard.imageUrl);
    }
  }

  Storyboard.findByIdAndUpdate(
    storyboardId,
    {
      $set: {
        imageUrl: imageUrl,
        scene: scene,
        cut: cut,
        video: video,
        audio: audio,
      },
    },
    { new: true }
  )
    .then((updatedStoryboard) => {
      return Storyboard.find({ project: projectId }).sort({ scene: 1, cut: 1 });
    })
    .then((updatedStoryboards) => {
      res.status(201).json({
        message: "storyboard updated",
        updatedStoryboard: updatedStoryboards,
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

exports.deleteStoryboard = async (req, res, next) => {
  const aCode = req.aCode;
  // 권한검사
  if (aCode !== 1 && aCode !== 2) {
    const error = new Error("Not authorized");
    //error.statusCode = 403;
    return next(error);
  }

  const storyboardIds = req.body.storyboardIds;
  const projectId = req.params.projectId;

  Storyboard.find({ _id: { $in: storyboardIds } })
    .then((storyboards) => {
      if (storyboards.length === 0) {
        const error = new Error("Could not find storyboards to delete");
        //error.statusCode = 404;
        return next(error);
      }

      for (const storyboard of storyboards) {
        if (storyboard.imageUrl) {
          deleteFile(storyboard.imageUrl);
        }
      }
      return Storyboard.deleteMany({ _id: { $in: storyboardIds } });
    })
    .then((result) => {
      return Storyboard.find({ project: projectId }).sort({ scene: 1, cut: 1 });
    })
    .then((storyboards) => {
      res.status(200).json({
        message: "deleting storyboards complete",
        storyboards: storyboards,
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
