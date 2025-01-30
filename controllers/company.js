const { validationResult } = require("express-validator");
const fs = require("fs");

const User = require("../modules/user");
const Company = require("../modules/company");
const Project = require("../modules/project");
