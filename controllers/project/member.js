const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const crypto = require("crypto");

const User = require("../../modules/user");
const Company = require("../../modules/company");
const Project = require("../../modules/project");

exports.getProjectMembers = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.data = errors.array(); // 유효성 검사 단계의 에러 정보들
      throw error;
    }

    const projectId = req.params.projectId;

    const members = await Project.findById(projectId, { members: 1 }).populate(
      "members.member",
      "email name phone imageUrl"
    );

    res.status(200).json({ members: members, authority: req.aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProjectMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, data has gone wrong");
      //error.statusCode = 422;
      error.message = errors.array()[0].msg;
      throw error;
    }

    const projectId = req.params.projectId;
    const memberId = req.params.memberId;

    const project = await Project.findById(projectId, { members: 1 }).populate(
      "members.member",
      "email name phone imageUrl"
    );

    const member = project.members.find(
      (i) => i.member._id.toString() === memberId
    );

    res.status(200).json({ member: member, authority: req.aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createProjectMember = async (req, res, next) => {
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
    const email = req.body.email;
    const pRole = req.body.pRole;
    const authority = req.body.authority;

    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error("User not found");
      //error.statusCode = 404;
      throw error;
    }

    const member = {
      member: user._id,
      pRole: pRole,
      authority: authority,
    };

    console.log(member);

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $push: { members: member } },
      { new: true }
    );

    user.projects.push(project._id);

    user.save();
    console.log(user);

    const updatedProject = await Project.findById(projectId, {
      members: 1,
    });

    const newMember = updatedProject.members.find(
      (i) => i.member._id === user._id
    );

    res.status(201).json({ newMember: newMember, authority: aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateProjectMember = async (req, res, next) => {
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
    const memberId = req.params.memberId;
    const pRole = req.body.pRole;
    const authority = req.body.authority;

    const project = await Project.findById(projectId);

    const member = project.members.find((i) => i._id.toString() === memberId);

    console.log("this is member : ", member);
    console.log("this is authority : ", authority);

    if (member.authority == 1 && authority != 1) {
      const error = new Error("owner's authority cannot be altered");
      //error.statusCode = 404;
      throw error;
    }

    // 프로젝트의 해당 멤버 업데이트
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, "members._id": memberId }, // 프로젝트와 해당 멤버를 찾기 위한 쿼리
      {
        $set: {
          "members.$.pRole": pRole,
          "members.$.authority": authority,
        },
      },
      { new: true }
    ).populate("members.member", "email name phone imageUrl");
    if (!updatedProject) {
      const error = new Error("Project or member not found");
      //error.statusCode = 404;
      throw error;
    }

    // 업데이트된 멤버 찾기
    const updatedMember = updatedProject.members.find(
      (member) => member._id.toString() === memberId
    );

    res.status(201).json({ updatedMember: updatedMember, authority: aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteProjectMember = async (req, res, next) => {
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
    const memberId = req.body.memberId;

    const project = await Project.findById(projectId, { members: 1 });

    const member = project.members.find(
      (i) => i.member.toString() === memberId
    );

    if (!member) {
      const error = new Error("no member to delete");
      //error.statusCode = 403;
      throw error;
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { members: member } },
      { new: true }
    ).populate("members.member", "email, name, phone, imageUrl");

    const updatedMembers = updatedProject.members;

    User.findByIdAndUpdate(member.member, {
      $pull: { projects: updatedProject._id },
    });

    res.status(201).json({ updatedMembers: updatedMembers, authority: aCode });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
