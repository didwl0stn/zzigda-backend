const { validationResult } = require("express-validator");
const fs = require("fs");

const Project = require("../../../modules/project");
const Callsheet = require("../../../modules/project/callsheet");

const fileEdit = require("../../../util/file");

exports.getWeathers = (req, res, next) => {
  const projectId = req.params.projectId;
  let totalItems; // 프론트에서 pagination논리에 필요한 총 데이터 수

  Callsheet.find({ project: projectId })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Callsheet.find({ project: projectId });
    })
    .then((callsheets) => {
      console.log(callsheets);
      if (callsheets.length > 0) {
        res.status(200).json({
          callsheets: callsheets,
          totalItems: totalItems,
          authority: req.aCode,
        });
      }
      const error = new Error("No callsheets could be found");
      //error.statusCode = 404;
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getWeather = (req, res, next) => {
  const userId = req.userId;
  const callsheetId = req.params.callsheetId;

  Callsheet.findById(callsheetId)
    .then((callsheet) => {
      if (!callsheet) {
        const error = new Error("No callsheet could be found");
        //error.statusCode = 404;
      }
      res.status(200).json({ callsheet: callsheet, authority: req.aCode });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createWeather = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    next(error);
  }

  const name = req.body.name;
  const date = req.body.date;
  const crewCall = req.body.crewCall;
  const projectId = req.params.projectId;
  // 회사는 userId로 찾아 넣기
  Project.findById(projectId)
    .populate("company")
    .then((project) => {
      if (!project) {
        const error = new Error("no such project to create callsheet");
        //error.statusCode = 401;
        next(error);
      }

      const companyId = project.company._id;
      const callsheet = new Callsheet({
        name: name,
        company: companyId,
        date: date,
        crewCall: crewCall,
        project: projectId,
      });
      return callsheet
        .save()
        .then((callsheet) => {
          res.status(201).json({
            message: "Callsheet Created!",
            callsheetId: callsheet._id,
          });
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

exports.updateWeather = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, data has gone wrong");
    //error.statusCode = 422;
    error.message = errors.array()[0].msg;
    next(error);
  }

  // meta data
  const callsheetId = req.params.callsheetId;

  Project.findById(project_id)
    .then((project) => {
      if (!project) {
        const error = new Error("Could not find project");
        //error.statusCode = 404;
        next(error);
      }
      // Check user
      const member_with_authority = project.members.find(
        (member) => member.authority === 1
      );
      if (!member_with_authority) {
        console.log("No member with authority");
      }
      if (member_with_authority.member._id.toString() !== req.userId) {
        const error = new Error("Not authorized");
        //error.statusCode = 403;
        next(error);
      }
      project.name = project_name;
      // if (project.imageUrl !== imageUrl) {
      //   fileEdit.deleteFile(project.imageUrl);
      // }
      // project.imageUrl = imageUrl;
      return project.save();
    })
    .then((result) => {
      console.log(result);
      res.status(201).json({
        message: "project updated",
        project: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteWeather = (req, res, next) => {
  const callsheetId = req.params.callsheetId;
  const projectId = req.params.projectId;

  if (!callsheetId) {
    const error = new Error("No callsheetId!");
    //error.statusCode = 401;
    next(error);
  }

  // 권한 검증
  Project.findById(projectId)
    .then((project) => {
      const members_with_authority = project.members.filter(
        (member) => member.authority === 1 || 2
      );

      if (members_with_authority.length < 1) {
        console.log("No member with authority");
      }

      // Check user
      const member_with_authority = members_with_authority.find(
        (member) => member.member._id.toString() === req.userId
      );
      if (!member_with_authority) {
        const error = new Error("Not authorized");
        error.statusCode = 403;
        next(error);
      }

      Callsheet.findById(callsheetId)
        .then((callsheet) => {
          if (!callsheet) {
            const error = new Error("Could not find callsheet");
            //error.statusCode = 404;
            next(error);
          }
          return Callsheet.findByIdAndDelete(callsheetId);
        })
        .then((result) => {
          res.status(200).json({ message: "deleting callsheet complete" });
        })
        .catch((err) => {
          const error = new Error("deleting callsheet fail");
          //error.statusCode = 401;
          next(error);
        });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
