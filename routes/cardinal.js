const express = require("express");
const getPuppet = require("../controllers/cardinal/getPuppet");
const reload = require("../controllers/cardinal/reload");
const releasePuppet = require("../controllers/cardinal/releasePuppet");
const getProductDetails = require("../controllers/cardinal/getProductDetails");
const searchProducts = require("../controllers/cardinal/searchProducts");

const router = express.Router();

router.use(getPuppet);
router.use(reload);
router.post("/getProductDetails", getProductDetails);
router.post("/searchProducts", searchProducts);
router.use(releasePuppet);

module.exports = router;
