const { validationResult } = require("express-validator");
const fs = require("fs");

const User = require("../modules/user");
const Company = require("../modules/company");
const Project = require("../modules/project");
const fileEdit = require("../util/file");
const user = require("../modules/user");

const { format } = require("util");
const { v4: uuidv4 } = require("uuid");

const { Storage } = require("@google-cloud/storage");
const project = require("../modules/project");
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

      const folderName = "projectImage/";

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
    const folderName = "projectImage/";
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

exports.get_Projects = (req, res, next) => {
  const userId = req.userId;
  let totalItems; // 프론트에서 pagination논리에 필요한 총 데이터 수

  Project.find({ members: { $elemMatch: { member: userId } } })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Project.find({
        members: { $elemMatch: { member: userId } },
      }).populate("company", "name members");
    })
    .then((projects) => {
      console.log(projects);
      if (projects.length >= 0) {
        res.status(200).json({
          projects: projects,
          totalItems: totalItems,
        });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.get_Project = (req, res, next) => {
  const userId = req.userId;
  const project_id = req.params.projectId;

  Project.findById(project_id)
    .populate("company", "name members")
    .then((project) => {
      if (!project) {
        const error = new Error("No projects could be found");
        error.statusCode = 404;
      }
      res.status(200).json({
        project: project,
        authority: req.aCode,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.create_project = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    return next(error);
  }

  const name = req.body.name;
  let imageUrl;

  if (req.file) {
    imageUrl = await uploadFile(req, res, next);
    console.log("This is imageUrl : ", imageUrl);
  }
  // 회사는 userId로 찾아 넣기
  User.findById(req.userId)
    .populate("company")
    .then((user) => {
      if (!user) {
        const error = new Error("no such user to create project");
        //error.statusCode = 401;
        next(error);
      }

      const company_id = user.company._id;
      const project = new Project({
        name: name,
        company: company_id,
        imageUrl: imageUrl,
        members: [{ member: req.userId, pRole: "owner", authority: 1 }],
      });
      return project
        .save()
        .then((result) => {
          Company.findById(company_id)
            .then((company) => {
              company.projects.push(project);
              return company.save();
            })
            .catch((err) => {
              console.log(err);
              const error = new Error(
                "project push on company.projects failed"
              );
              // error.statusCode = 401;
              next(error);
            });
        })
        .then((result) => {
          return User.findById(req.userId);
        })
        .then((user) => {
          user.projects.push(project);
          return user.save();
        })
        .then((result) => {
          res
            .status(201)
            .json({ message: "Project Created!", project_id: project._id });
        })
        .catch((err) => {
          console.log(err);
          const error = new Error("Something went wrong on saving new project");
          //error.statusCode = 401;
          next(error);
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

exports.update_project = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }
    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    const projectId = req.params.projectId;
    const name = req.body.name;
    let imageUrl = req.body.image; // 기존 imageurl

    let project = await Project.findById(projectId);

    if (!project) {
      const error = new Error("no such project");
      //error.statusCode = 401;
      throw error;
    }

    if (req.file) {
      imageUrl = await uploadFile(req);
      console.log("This is imageUrl : ", imageUrl);

      if (project.imageUrl) {
        await deleteFile(project.imageUrl);
      }
    }
    project.imageUrl = imageUrl;
    project.name = name;
    await project.save();
    const updatedProject = await Project.findById(project._id).populate(
      "company",
      "name members"
    );

    res.status(201).json({
      message: "project updated",
      updatedProject: updatedProject,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.delete_project = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    if (!projectId) {
      const error = new Error("No project_id!");
      //error.statusCode = 401;
      throw error;
    }

    const aCode = req.aCode;
    // 권한검사
    if (aCode !== 1) {
      const error = new Error("Not authorized");
      //error.statusCode = 403;
      throw error;
    }

    let project = await Project.findById(projectId);

    if (!project) {
      const error = new Error("no such project");
      //error.statusCode = 401;
      throw error;
    }

    if (project.imageUrl) {
      await deleteFile(project.imageUrl);
    }

    await Project.deleteOne({ _id: project._id });

    await User.findByIdAndUpdate(
      req.userId,
      { $pull: { projects: projectId } },
      { new: true }
    );

    await Company.findOneAndUpdate(
      { projects: { $elemMatch: { $eq: projectId } } },
      { $pull: { projects: projectId } },
      { new: true }
    );

    res.status(200).json({ message: "deleting project complete" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
