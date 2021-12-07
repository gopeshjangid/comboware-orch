const router = require('express').Router();

const TicketController = require("../controllers/TicketController");
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

router.post("/createTicket", TicketController.createTicket);
/* router.post("/saveActivity", upload.single('ticket_image'), function (req, res, next) {
    if (!req.file) {
        return next('Error in upload');
    }
    TicketController.createTicket(req, res).then(function (res) { });
}) */
router.get("/getTicketDetails", auth, TicketController.getTicketDetails);
router.get("/getAllTicketRequest", auth, TicketController.getAllTicketRequest);
router.put("/updateTicketDetails", auth, TicketController.updateRequest);
router.get("/getCategories", auth, TicketController.getCategories);
router.get("/getSubCategories", auth, TicketController.getSubCategories);
router.post("/assignTicket", auth, TicketController.assignTicket);

router.post("/addActivities", auth, upload.single('image'), function (req, res, next) {
    if (!req.file) {
        console.log('Error in upload');
    }
    TicketController.addActivities(req, res).then(function (res) { });
});


module.exports = router;