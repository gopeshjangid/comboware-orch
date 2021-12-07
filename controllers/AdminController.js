const e = require("express");
const User = require("../models/User");
const Virtuozzo = require("../models/Virtuozzo");
var API = require("../utils.js");
class AdminController {

  static getProfile = async (req, res) => {
    try {
      let data = await User.getProfile(req.query.userId);
      if (data) {
        if (data.user['system_image']) {
          data.user['system_image'] = `${req.protocol}://${req.get('host')}/${data.user['system_image']}`;
        }
        if (data.user['profile_image']) {
          data.user['profile_image'] = `${req.protocol}://${req.get('host')}/${data.user['profile_image']}`;
        }
        if(data.trial_expire_date){
          data.trial_expire_date = API.DATE_FORMATTER(data?.trial_expire_date, 'DD-MM-YYYY H:mm:ss') || null;
        }
        if(data.trial_extend_date){
          data.trial_extend_date = API.DATE_FORMATTER(data?.trial_extend_date, 'DD-MM-YYYY H:mm:ss') || null;
        }
        return res.status(200).send({ "data": data, "status": true, "message": "Profile fetched successfully" });
      } else {
        return res.status(500).send({ "data": null, "status": false, "message": "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in getting profile." });
    }
  }

  static getUserDetails = async (req, res) => {
    let { userId, email } = req.body;
    try {
      let user = null;
      if (userId) {
        user = await User.getUserById(userId);
      } else if (email) {
        user = await User.getUserByEmail(req.body.email);
      }
      let domainDetails = Virtuozzo.getDomainDetails(user?.id);
      return res.status(200).json({ data: { user, domain: domainDetails } });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching user details." });
    }
  };

  static getAllUsers = async (req, res) => {
    try {
      let data = await User.getUser(`where user_type='${req?.query?.userType}'`);
      if (data) {
        let users = []
        data.forEach(user => {
          if (user.profile_image) {
            user.profile_image = `${req.protocol}://${req.get('host')}/${user.profile_image}`;
          } if (user.system_image) {
            user.system_image = `${req.protocol}://${req.get('host')}/${user.system_image}`;
          }
          users.push(user);
        });
      }
      return res.status(200).json({ data: data || null, "status": true, "message": "All users fetched" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching user details." });
    }
  };

  static adminLogin = async (req, res) => {
    try {
      let adminData = await User.adminLogin(req.body);
      if (adminData) {
        return res.status(200).json({ "data": adminData, "status": true, "message": "Admin successfully logged in" });
      } else {
        return res.status(500).json({ "data": null, "status": false, "message": "Invalid credentials" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in login admin." });
    }
  };

  static getLogs = async (req, res) => {
    try {
      let data = await User.getLogs();
      let allLogs = [];
      if (data) {
        data.forEach(log => {
          // console.log(log)
          log.date_time = (log?.date_time) ? API.DATE_FORMATTER(log?.date_time, 'DD-MM-YYYY H:mm:ss') : log?.date_time;
          allLogs.push(log);
        });
      }
      return res.status(200).json({ data: allLogs || null, "status": true, "message": "All users fetched" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching user details." });
    }
  };  

  static updateAdminSetting = async (req, res) => {
    try {
      let settingData = await User.updateAdminSetting(req?.body);
      return res.status(200).json({ "data": settingData || null, "status": true, "message": "Admin Setting updated successfully." });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in updating Admin Setting." });
    }
  };

  static getSettings = async (req, res) => {
    try {
      let data = await User.getSettings(req?.query);
      return res.status(200).json({ data: data || null, "status": true, "message": "Settings fetched" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching settings." });
    }
  };
}

module.exports = AdminController;
