const express = require("express");
const router = express.Router();
const logger = require("../config/winston");
const models = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/", async function(req, res, next) {

  try {
    if(!req.body.user || !req.body.password) return res.sendStatus(401);
    const user = await models.user.findOne({where:{name:req.body.user}});
    if(!user || !user.password) return res.sendStatus(401);
    const result = await bcrypt.compare(req.body.password, user.password);
    if(!result) return res.sendStatus(401);
    const jwtBearerToken = jwt.sign({}, process.env.RSA_PRIVATE_KEY, {algorithm:"RS256", expiresIn:3600, subject:req.body.user});
    res.status(200).json({idToken:jwtBearerToken, expiresIn:300});
  } catch(error) {
    error = "Error logging in: " + error;
    logger.debug(error);
    throw error;
  }

});

module.exports = router;
