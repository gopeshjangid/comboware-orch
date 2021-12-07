const router = require('express').Router();

const AdminController = require("../controllers/AdminController");
const auth = require("../middleware/auth");

router.post("/adminLogin", AdminController.adminLogin);
router.get("/getAllUsers", auth, AdminController.getAllUsers);
router.get("/getLogs", auth, AdminController.getLogs);
router.put("/updateAdminSetting", auth, AdminController.updateAdminSetting);

module.exports = router;