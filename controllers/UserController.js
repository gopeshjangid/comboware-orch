const e = require("express");
const User = require("../models/User");
const Virtuozzo = require("../models/Virtuozzo");
const Workspace = require("../models/Workspace");
var API = require("../utils.js");
class UserController {

  static register = async (req, res) => {
    try {
      
      let data = await User.register(req.body);
      return res.status(200).send({ "data": data, "status": true, "message": "User has been created successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in creating user." });
    }
  }

  static updateProfile = async (req, res) => {
    try {
      
      let data = await User.updateProfile(req);
      if (data == 'Unable to create user on virtuozzo but user profile updated.') {
        return res.status(500).json({ data: null, status: false, message: data });
      } else if (data == 'Unable to get project details from virtuozzo for this user, so user can not be create but user profile updated.') {
        return res.status(500).json({ data: null, status: false, message: data });
      } else {
        if (data.user['system_image']) {
          data.user['system_image'] = `${req.protocol}://${req.get('host')}/${data.user['system_image']}`;
        }
        return res.status(200).send({ "data": data, "status": true, "message": "Profile updated successfully" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in updating profile." });
    }
  }

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

  static updateSystemData = async (req, res) => {
    try {
      let imageData = await User.updateSystemData(req);
      if (imageData.system_image) {
        imageData.system_image = `${req.protocol}://${req.get('host')}/${imageData.system_image}`;
      }
      return res.status(200).json({ "data": imageData || null, "status": true, "message": "System Data updated successfully." });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in updating user system data." });
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
      return res.status(200).json({ data: allLogs || null, "status": true, "message": "All logs fetched" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching logs." });
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
      let resources,envPlans,commonSettings = null;
      let settings = await User.getSettings(req?.query);
      if(req?.query?.user_type){
        resources = await Workspace.getResQuoteDetails();
        envPlans = await Workspace.getEnvPlanDetails();
        commonSettings = await User.getAdminSettings();
      }
      let data = {settings:settings,resources:resources,envPlans:envPlans,commonSettings:commonSettings}
      return res.status(200).json({ data: data || null, "status": true, "message": "Settings fetched" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching settings." });
    }
  };

  static updateUserFields = async (req, res) => {
    try {
      let settingData = await User.updateUserFields(req?.body);
      return res.status(200).json({ "data": settingData || null, "status": true, "message": "User updated successfully." });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || "Error in updating user." });
    }
  };

  static getAuthToken = async (req, res) => {
    try {
      let data = await User.getAuthToken(req?.query);
      return res.status(200).json({ data: data || null, "status": true, "message": "Auth token created" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in created auth token." });
    }
  };

  static saveSkills = async (req, res) => {
    try {
      let data = await User.saveSkills(req?.body);
      return res.status(200).json({ data: data || null, "status": true, "message": "Skills created" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in created skills." });
    }
  };

  static saveSkillLevels = async (req, res) => {
    try {
      let data = await User.saveSkillLevels(req?.body);
      return res.status(200).json({ data: data || null, "status": true, "message": "Skills level created" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in created skill level." });
    }
  };

  static getSkillLevels = async (req, res) => {
    try {
      let data = await User.getSkillLevels(req?.query);
      return res.status(200).json({ data: data || null, "status": true, "message": "Data Fetched successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching skill level." });
    }
  };

  static changeSkillLevelStatus = async (req, res) => {
    try {
      let data = await User.changeSkillLevelStatus(req?.body);
      return res.status(200).json({ data: data || null, "status": true, "message": "Deleted successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in deleting skill level." });
    }
  };

  static addAdminSetting = async (req, res) => {
    try {
      let settingData = await User.addAdminSetting(req?.body);
      return res.status(200).json({ "data": settingData || null, "status": true, "message": "Admin Setting updated successfully." });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || "Error in updating admin setting." });
    }
  };

  static manageUserAccount = async (req, res) => {
    try {
      let data = await User.manageUserAccount(req?.body);
      return res.status(200).json({ "data": data || null, "status": true, "message": "User account updated successfully." });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || "Error in updating user account." });
    }
  };

}

module.exports = UserController;
