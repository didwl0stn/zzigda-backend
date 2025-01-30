const { validationResult } = require("express-validator");

const Files = require("../../modules/project/files");

const { format } = require("util");
const { v4: uuidv4 } = require("uuid");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucket = storage.bucket("helloworld-app-410701.appspot.com");

const uploadFile = (req) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(req.file);

      const folderName = "files/";

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

// const downloadFile = async (req, res, next) => {
//   try {
//     const fileUrl = req.params.url;
//     const folderName = "files/";
//     const fileName =
//       folderName + fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
//     const [metaData] = await bucket.file(fileName).getMetadata();
//     res.redirect(metaData.mediaLink);
//   } catch (err) {
//     console.log(err);
//     const error = new Error(`Could not download the file.`);
//     error.statusCode = 500;
//     next(error);
//   }
// };

const deleteFile = async (url) => {
  try {
    const folderName = "files/";
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

exports.getProjectFiles = async (req, res, next) => {
  try {
    const files = await Files.find({ project: req.params.projectId }).populate(
      "uploader",
      "name"
    );
    res.status(200).json({
      files: files,
      authority: req.aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.downloadProjectFile = async (req, res, next) => {
  try {
    const fileUrl = req.body.url;
    const folderName = "files/";
    const fileName =
      folderName + fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
    const [metaData] = await bucket.file(fileName).getMetadata();
    res.redirect(metaData.mediaLink);
  } catch (err) {
    console.log(err);
    const error = new Error(`Could not download the file.`);
    error.statusCode = 500;
    next(error);
  }
};

exports.createProjectFiles = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("no file to upload!!");
      //error.statusCode(403);
      throw error;
    }

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const url = await uploadFile(req);
    console.log("This is file url : ", url);

    const fileName = req.file.originalname;

    const uploader = req.userId;

    const file = new Files({
      url: url,
      fileName: fileName,
      uploader: uploader,
      project: req.params.projectId,
    });

    await file.save();

    const files = await Files.find({ project: req.params.projectId }).populate(
      "uploader",
      "name"
    );

    res.status(201).json({
      message: "file uploaded!",
      files: files,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteProjectFiles = async (req, res, next) => {
  try {
    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1 && aCode !== 2) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const url = req.body.url;

    if (!url) {
      const error = new Error("no file to delete!!");
      //error.statusCode(403);
      throw error;
    }

    await deleteFile(url);

    await Files.deleteOne({ url: url });

    const files = await Files.find({ project: req.params.projectId }).populate(
      "uploader",
      "name"
    );

    res.status(201).json({
      message: "file deleted!",
      files: files,
      authority: aCode,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
