const express = require('express');
const router = express.Router();
const logger = require('../config/winston');
const models = require('../models');
const sanitizeHtml = require('sanitize-html');
const jwt = require('express-jwt');
const config = require("config");

router.post('/:workflowId/:position', jwt({secret:config.get("jwt.RSA_PRIVATE_KEY"), algorithms:['RS256']}), async function(req, res, next) {

  if(!req.body.name || !req.body.doc || !req.body.type) { logger.debug("Missing params"); return res.status(500).send("Missing parameters."); }

  try {
    await models.step.upsert({name:sanitizeHtml(req.body.name), doc: sanitizeHtml(req.body.doc), type:sanitizeHtml(req.body.type), workflowId:req.params.workflowId, position:req.params.position});
    let stepId = await models.step.findOne({where:{workflowId:req.params.workflowId, position:req.params.position}});
    res.send({"id":stepId.id});
  } catch(error) {
    error = "Error adding step: " + (error&&error.errors&&error.errors[0]&&error.errors[0].message?error.errors[0].message:error);
    logger.debug(error);
    res.status(500).send(error);
  }

});

router.post('/delete/:workflowId/:position', jwt({secret:config.get("jwt.RSA_PRIVATE_KEY")}), async function(req, res, next) {

  try {
    let removedStep = await models.step.destroy({where:{workflowId:req.params.workflowId, position:req.params.position}});
    let stepId = await models.step.findOne({where:{workflowId:req.params.workflowId, position:req.params.position}});
    await models.input.destroy({where:{stepId:stepId}});
    await models.output.destroy({where:{stepId:stepId}});
    await models.implementation.destroy({where:{stepId:stepId}});
    res.sendStatus(200);
  } catch(error) {
    error = "Error deleting step: " + (error&&error.errors&&error.errors[0].message?error.errors[0].message:error);
    logger.debug(error);
    res.status(500).send(error);
  }

});

module.exports = router;
