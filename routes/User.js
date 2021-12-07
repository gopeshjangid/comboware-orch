const router = require('express').Router();

const UserController = require("../controllers/UserController");
const auth = require("../middleware/auth");

var multer = require('multer');
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public');
    },
    filename: (req, file, cb) => {
        var filetype = '';
        if (file.mimetype === 'image/gif') {
            filetype = 'gif';
        }
        if (file.mimetype === 'image/png') {
            filetype = 'png';
        }
        if (file.mimetype === 'image/jpeg') {
            filetype = 'jpg';
        }
        cb(null, Date.now() + Math.random().toString(36).substring(2, 15) + '.' + filetype);
    }
});
var upload = multer({ storage: storage });

router.post("/register", UserController.register);
router.post("/adminLogin", UserController.adminLogin);
// router.put("/updateProfile", auth, UserController.updateProfile);
router.put("/updateProfile", upload.single('profile_image'), function (req, res, next) {
    if (!req.file) {
        console.log('Error in upload user profile image');
    }
    UserController.updateProfile(req, res).then(function (res) { });
});
router.get("/getProfile", auth, UserController.getProfile);
router.put("/getUserDetails", auth, UserController.getUserDetails);
router.put("/updateSystemData", auth, upload.single('server_image'), function (req, res, next) {
    if (!req.file) {
        next('Error in upload user server image');
    }
    UserController.updateSystemData(req, res).then(function (res) { });
});
router.get("/getAllUsers", auth, UserController.getAllUsers);
router.get("/getLogs", auth, UserController.getLogs);
router.put("/updateAdminSetting", auth, UserController.updateAdminSetting);
router.put("/updateUserFields", auth, UserController.updateUserFields);
router.get("/getSettings", auth, UserController.getSettings);
router.get("/getAuthToken", auth, UserController.getAuthToken);
router.post("/saveSkills", UserController.saveSkills);
router.post("/saveSkillLevels", UserController.saveSkillLevels);
router.get("/getSkillLevels", UserController.getSkillLevels);
router.put("/changeSkillLevelStatus", UserController.changeSkillLevelStatus);
router.post("/addAdminSetting", UserController.addAdminSetting);
router.post("/manageUserAccount", UserController.manageUserAccount);
// router.get("/logout", auth, UserController.logout);

module.exports = router;