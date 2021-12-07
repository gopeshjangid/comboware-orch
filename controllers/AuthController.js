/**
 * AuthController.js
 *
 * Unless you are trying to implement some custom functionality, you shouldn't
 * need to edit this file.
 */

/****************************************************************
 *				   DO NOT TOUCH BELOW THIS LINE 				 *
 ****************************************************************/

var express = require("express");
var router = express.Router();

var APIController = require("./ApiController.js");

/**  Model and route setup **/

/****************************************************************
 *                          Login methods                       *
 ****************************************************************/

router.use("/api", async function (req, res) {
  try {
    let response = await APIController.callApi(req,res);
    let code =  response?.status || 500;
    return res.status(code).json(response);
  } catch (err) {
    return res.status(500).json({data : err?.message , status : 500});
  }
});


module.exports = router;
