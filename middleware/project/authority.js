const Project = require("../../modules/project");

module.exports = (req, res, next) => {
  Project.findById(req.params.projectId, { members: 1 })
    .then((project) => {
      if (!project) {
        const error = new Error("no such project");
        error.statusCode = 401;
        return next(error);
      }
      const member = project.members.find(
        (member) => member.member.toString() === req.userId.toString()
      );

      if (!member || !member.authority) {
        const error = new Error("It's not member of this project");
        error.statusCode = 401;
        return next(error);
      }

      req.aCode = member.authority;
      next();
    })
    .catch((err) => {
      console.log(err);
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
