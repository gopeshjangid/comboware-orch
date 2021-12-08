const VZ = require("./VZController");
const Virtuozzo = require("../models/Virtuozzo");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
var API = require("../utils");

class TicketController {

  static createTicket = async (req, res) => {
    try {
      let data = await Ticket.createTicket(req.body);
      if (data) {
        return res.status(200).json({ data: data, status: true, message: "Ticket created successfully" });
      } else {
        return res.status(500).send({ "data": null, "status": false, "message": "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in creating ticket." });
    }
  };

  static addActivities = async (req, res) => {
    try {
      let data = await Ticket.addActivities(req);
      var activities = [];
      if (data) {
        data.forEach(element => {
          if (element.type == 'IMAGE') {
            element.content = `${req.protocol}://${req.get('host')}/${element.content}`;
          }
          activities.push(element);
        });
      }
      if (activities) {
        return res.status(200).json({ data: activities, status: true, message: "Activities added successfully" });
      } else {
        return res.status(500).send({ "data": null, "status": false, "message": "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in creating ticket." });
    }
  };

  static getTicketDetails = async (req, res) => {
    try {
      if (!req.query.ticketNumber) {
        return res.status(500).json({ data: null, status: false, message: "Ticket Id missing." });
      }

      // let userData = await User.getUserById(req?.query?.userId);
      // if (userData[0]) {
      //   delete userData[0]?.password;
      //   let userWhere = req?.query?.userType !== 'ADMIN' ? `  (user_id =${req?.query?.userId} and ticket_number = '${req?.query?.ticketNumber}') or (assignee_id =${req?.query?.userId} and ticket_number = '${req?.query?.ticketNumber}')` : ` ticket_number = '${req?.query?.ticketNumber}'`
        // let data = await Ticket.getTicketDetails(` where ${userWhere} `);
        let data = await Ticket.getTicketDetails(` where ticket_number = '${req?.query?.ticketNumber}' `);
        // console.log("data--===",data)
        if (data) {
          let activities = [];
          let tickets = [];
          if (data?.activities) {
            data?.activities.map(element => {
              if (element?.type == 'IMAGE') {
                element.content = `${req.protocol}://${req.get('host')}/${element?.content}`;
              }
              element.created_at = (element?.created_at) ? API.DATE_FORMATTER(element?.created_at, 'DD-MM-YYYY H:mm:ss') : element?.created_at;
              activities.push(element);
            });
          }
          if (data?.ticket) {
            data.ticket.forEach(ticket => {
              if (ticket?.user_id != ticket?.assignee_id && ticket?.user_type == 'ER') {
                ticket.can_edit = true;
              } else {
                ticket.can_edit = false;
              }
              ticket.ticket_date = (ticket?.ticket_date) ? API.DATE_FORMATTER(ticket?.ticket_date, 'DD-MM-YYYY H:mm:ss') : ticket?.ticket_date;
              ticket.ticket_processing_date = (ticket.ticket_processing_date) ? API.DATE_FORMATTER(ticket.ticket_processing_date, 'DD-MM-YYYY H:mm:ss') : ticket.ticket_processing_date;
              ticket.ticket_completion_date = (ticket.ticket_completion_date) ? API.DATE_FORMATTER(ticket.ticket_completion_date, 'DD-MM-YYYY H:mm:ss') : ticket.ticket_completion_date;
              tickets.push(ticket);
            });
          }
          let userData = await User.getUserById(data?.ticket[0]?.user_id);
          data.activities = activities;
          if (userData[0]?.profile_image) {
            userData[0].profile_image = `${req.protocol}://${req.get('host')}/${userData[0]?.profile_image}`;
          }
          if (userData[0]?.system_image) {
            userData[0].system_image = `${req.protocol}://${req.get('host')}/${userData[0]?.system_image}`;
          }
          data.user = userData[0];
          data.ticket = tickets[0];
          return res.status(200).json({ data: data || null, status: true, message: "Fetched Ticket Details successfully" });
        } else {
          return res.status(500).json({ data: null, status: false, message: "Invalid Ticket" });
        }
      // } else {
      //   return res.status(500).json({ data: null, status: false, message: "Invalid User" });
      // }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching ticket details." });
    }
  };

  static getAllTicketRequest = async (req, res) => {
    try {
      let cond = (req?.query?.user_type==='ADMIN')? `where 1 ` : ` where (user_id = ${req.query.userId} or assignee_id=${req.query?.userId}) `;
      if (req.query.ticket_status == 'ALL' && req.query.repair_status == 'ALL') { }
      if (req.query.ticket_status == 'ALL' && req.query.repair_status != 'ALL') {
        cond = `and repair_status = '${req.query.repair_status}'`
      }
      if (req.query.ticket_status != 'ALL' && req.query.repair_status == 'ALL') {
        cond = `and ticket_status = '${req.query.ticket_status}'`
      }
      if (req.query.ticket_status != 'ALL' && req.query.repair_status != 'ALL') {
        cond = `and ticket_status = '${req.query.ticket_status}' and repair_status = '${req.query.repair_status}'`
      }
      
      let data = await Ticket.getAllTickets(cond);
      // console.log('&&&',data);
      data = data.map(element => {
        delete element.password;
        if (element.profile_image) {
          element.profile_image = `${req.protocol}://${req.get('host')}/${element?.profile_image}`;
        }
        if (element.system_image) {
          element.system_image = `${req.protocol}://${req.get('host')}/${element?.system_image}`;
        }

        element.ticket_date = (element?.ticket_date) ? API.DATE_FORMATTER(element?.ticket_date, 'DD-MM-YYYY H:mm:ss') : element?.ticket_date;
        element.ticket_processing_date = (element?.ticket_processing_date) ? API.DATE_FORMATTER(element?.ticket_processing_date, 'DD-MM-YYYY H:mm:ss') : element.ticket_processing_date;
        element.ticket_completion_date = (element?.ticket_completion_date) ? API.DATE_FORMATTER(element?.ticket_completion_date, 'DD-MM-YYYY H:mm:ss') : element?.ticket_completion_date;
        return element;
      });
      return res.status(200).json({ data: data || null, status: true, message: "Fetched All Tickets successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching all ticket details." });
    }
  };

  static updateRequest = async (req, res) => {
    try {
      let data = await Ticket.updateRequest(req);
      if (data) {
        if (data == 'Invalid Ticket') {
          return res.status(500).json({ data: null, status: false, message: data });
        } else {
          return res.status(200).json({ data: data || null, status: true, message: "Update ticket Request successfully" });
        }
      } else {
        return res.status(500).json({ data: null, status: false, message: "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching all ticket details." });
    }
  };

  static getCategories = async (req, res) => {
    try {
      let data = await Ticket.getCategories();
      return res.status(200).json({ data: data || null, status: true, message: "Fetched category successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching category details." });
    }
  };

  static getSubCategories = async (req, res) => {
    try {
      if (!req.query.categoryId) {
        return res.status(500).json({ data: null, status: false, message: "Category Id missing." });
      }
      let data = await Ticket.getSubCategories(req?.query?.categoryId);
      if (data[0]) {
        return res.status(200).json({ data: data || null, status: true, message: "Fetched subcategory successfully" });
      } else {
        return res.status(500).json({ data: null, status: false, message: "Invalid Category" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching ticket details." });
    }
  };



  static assignTicket = async (req, res) => {
    try {
      let data = await Ticket.assignTicket(req);
      if (data) {
        if (data == 'Invalid Ticket') {
          return res.status(500).json({ data: null, status: false, message: data });
        } else {
          return res.status(200).json({ data: data || null, status: true, message: "Assign ticket successfully" });
        }
      } else {
        return res.status(500).json({ data: null, status: false, message: "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching all ticket details." });
    }
  };

}

module.exports = TicketController