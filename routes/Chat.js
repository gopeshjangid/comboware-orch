const router = require('express').Router();

const ChatController = require("../controllers/ChatController");

router.post("/sendMessage", ChatController.sendMessage);
router.get("/getLatestMessage", ChatController.getLatestMessage);
router.get("/getAllLatestMessage", ChatController.getAllLatestMessage);
router.post("/replyChatByAdmin", ChatController.replyChatByAdmin);
router.get("/getAllMessages", ChatController.getAllMessages);
router.get("/getAllChats", ChatController.getAllChats);
module.exports = router;