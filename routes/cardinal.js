const express = require("express");
const getPuppet = require("../controllers/cardinal/getPuppet");
const reload = require("../controllers/cardinal/reload");
const releasePuppet = require("../controllers/cardinal/releasePuppet");
const getProductDetails = require("../controllers/cardinal/getProductDetails");

const router = express.Router();

router.use(getPuppet);
router.use(reload);
router.post("/getProductDetails", getProductDetails);
router.use(releasePuppet);

module.exports = router;
