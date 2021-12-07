const Chat = require("../models/Chat");
const User = require("../models/User");
var API = require("../utils");

class ChatController {
  static sendMessage = async (req, res) => {
    try {
      let data = await Chat.saveChat(req.body);
      if (data) {
        return res
          .status(200)
          .json({
            data: data,
            status: true,
            message: "Chat saved successfully",
          });
      } else {
        return res
          .status(500)
          .send({ data: null, status: false, message: "Invalid User" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in saving chat.",
        });
    }
  };

  static replyChatByAdmin = async (req, res) => {
    try {
      let data = await Chat.replyChatByAdmin(req.body);
      if (data) {
        return res
          .status(200)
          .json({
            data: data,
            status: true,
            message: "Reply saved successfully",
          });
      } else {
        return res
          .status(500)
          .send({ data: null, status: false, message: "Invalid User" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in replying chat.",
        });
    }
  };

  static getLatestMessage = async (req, res) => {
    try {
      // let data = await Chat.getLatestMessage(req.query);
      let data = await Chat.getLatestChat(
        `where chat_id= '${req?.query?.chat_id}' and sender_id !=${req?.query?.userId} and is_read=0 order by id desc`
      );
      if (data[0]) {
        data[0].chat_date_time = data[0]?.chat_date_time
          ? API.DATE_FORMATTER(data[0]?.chat_date_time, "DD-MM-YYYY H:mm:ss")
          : data[0]?.chat_date_time;
        return res
          .status(200)
          .json({
            data: data[0],
            status: true,
            message: "Chat fetched successfully",
          });
      } else {
        return res
          .status(500)
          .send({
            data: null,
            status: false,
            message: "Chat details not found",
          });
      }
    } catch (error) {
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in fetching chat.",
        });
    }
  };

  static getAllLatestMessage = async (req, res) => {
    try {
      let adminData = await User.getUser(`where user_type='ADMIN'`);
      let data = await Chat.getChat(
        `where sender_id != '${adminData[0]?.id}' group by sender_id order by id desc`
      );
      let resultData = [];
      data.forEach((element) => {
        element.chat_date_time = element?.chat_date_time
          ? API.DATE_FORMATTER(element?.chat_date_time, "DD-MM-YYYY H:mm:ss")
          : element?.chat_date_time;
        resultData.push(element);
      });
      if (resultData.length) {
        return res
          .status(200)
          .json({
            data: resultData,
            status: true,
            message: "All Latest messages fetched successfully",
          });
      } else {
        return res
          .status(500)
          .send({
            data: null,
            status: false,
            message: "Chat details not found",
          });
      }
    } catch (error) {
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in fetching chat.",
        });
    }
  };

  static getAllMessages = async (req, res) => {
    try {
      let data = await Chat.getChat(
        `where chat_id= '${req?.query?.chat_id}' order by id desc`
      );

      // console.log("resultData===" ,data);
      data = data?.map((element) => {
        element.chat_date_time = element?.chat_date_time
          ? API.DATE_FORMATTER(element?.chat_date_time, "DD-MM-YYYY H:mm:ss")
          : element?.chat_date_time;

          // console.log("eleement" ,element)
        return element;
      });
      // console.log("resultData" ,data);
      if (data.length) {
        return res
          .status(200)
          .json({
            data: data,
            status: true,
            message: "Chat fetched successfully",
          });
      } else {
        return res
          .status(500)
          .send({
            data: null,
            status: false,
            message: "Chat details not found",
          });
      }
    } catch (error) {
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in fetching chat.",
        });
    }
  };

  static getRecieverData = async (data) => {
    let resultData = [];
    for (let i = 0; i < data.length; i++) {
      let element = data[i];
      var senderData = await Chat.getAllChats(
        ` where chat_id = '${element.chat_id}' and (sender_name!='' or sender_name!=NULL)`
      );
      element.receiver_name = senderData[0]?.sender_name;
      element.chat_date_time = element?.chat_date_time
        ? API.DATE_FORMATTER(element?.chat_date_time, "DD-MM-YYYY H:mm:ss")
        : element?.chat_date_time;
      resultData.push({ ...element });
    }
    return Promise.all(resultData);
  };

  static getAllChats = async (req, res) => {
    try {
      let adminData = await User.getUser(`where user_type='ADMIN'`);
      // let data = await Chat.getChat(`where sender_id != '${adminData[0]?.id}' group by sender_id order by id desc`);
      // let data = await Chat.getAllChats(``);
      let data = await Chat.getAllChats(` where id in
            (SELECT  max(id) as id  FROM chat GROUP by chat_id)
             ORDER BY id desc `);
      let resultData = await ChatController.getRecieverData(data);
      if (resultData.length) {
        return res
          .status(200)
          .json({
            data: resultData,
            status: true,
            message: "Chat fetched successfully",
          });
      } else {
        return res
          .status(500)
          .send({
            data: null,
            status: false,
            message: "Chat details not found",
          });
      }
    } catch (error) {
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in fetching chat.",
        });
    }
  };
}

module.exports = ChatController;
