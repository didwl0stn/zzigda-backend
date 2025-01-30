const util = require("util");
const Multer = require("multer");

let processFile = Multer({
  storage: Multer.memoryStorage(),
}).single("file");

module.exports = util.promisify(processFile);
