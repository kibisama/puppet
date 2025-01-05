const express = require("express");
const getPuppet = require("../controllers/pharmsaver/getPuppet");
const reload = require("../controllers/pharmsaver/reload");
const releasePuppet = require("../controllers/pharmsaver/releasePuppet");
const getSearchResults = require("../controllers/pharmsaver/getSearchResults");

const router = express.Router();

router.use(getPuppet);
router.use(reload);
router.post("/getSearchResults", getSearchResults);
router.use(releasePuppet);

module.exports = router;
