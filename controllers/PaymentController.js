const Payment = require("../models/Payment");
const User = require("../models/User");
var API = require("../utils");

class PaymentController {

  static savePayment = async (req, res) => {
    try {
      let data = await Payment.savePayment(req.body);
      if (data) {
        data.payment_date = (data?.payment_date) ? API.DATE_FORMATTER(data?.payment_date, 'DD-MM-YYYY H:mm:ss') : data?.payment_date;
        return res.status(200).json({ data: data, status: true, message: "Payment saved successfully" });
      } else {
        return res.status(500).send({ "data": null, "status": false, "message": "unable to save payment details" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in saving payment." });
    }
  };

  static getPaymentDetails = async (req, res) => {
    try {
      let data = await Payment.getPayment(`where user_id= ${req.query.userId} and payment_id = '${req.query.payment_id}'`);
      if (data[0]) {
        data[0].payment_date = (data[0]?.payment_date) ? API.DATE_FORMATTER(data[0]?.payment_date, 'DD-MM-YYYY H:mm:ss') : data[0]?.payment_date;
        return res.status(200).json({ data: data[0], status: true, message: "Payment fetched successfully" });
      } else {
        return res.status(500).send({ "data": null, "status": false, "message": 'Details not found' });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching payment." });
    }
  };

  static getAllPayments = async (req, res) => {
    try {
      let qry = '';
      /*if (req?.query?.payment_status !== 'ALL') {
        qry = `where payment_status= '${req?.query?.payment_status}' and is_paid=1`;
        if (req?.query?.payment_id) {
          qry += ` and payment_id like '%${req?.query?.payment_id}%' `;
        }
      } else if (req?.query?.payment_id) {
        qry = `where payment_id like '%${req?.query?.payment_id}%' and is_paid=1`;
      } else {
        qry += `where is_paid=1`
      }*/

      let where = req?.query?.userId ? ` where user_id =${req?.query?.userId} and payment_status='${req?.query?.payment_status}'` : ` where payment_status='${req?.query?.payment_status}'`;

      let data = await Payment.getPayment(where);
      let allPayments = [];
      if (data) {
        data.forEach(payment => {
          payment.payment_date = (payment?.payment_date) ? API.DATE_FORMATTER(payment?.payment_date, 'DD-MM-YYYY H:mm:ss') : payment?.payment_date;
          allPayments.push(payment);
        });
      }
      if (allPayments.length) {
        return res.status(200).json({ data: allPayments, status: true, message: "All Payments fetched successfully" });
      } else {
        return res.status(200).send({ "data": [], "status": false, "message": 'no payment found' });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching payment." });
    }
  };

  static getBillingAmount = async (req, res) => {
    try {
      let data = await Payment.getBillingAmount(req.body);
      if (data) {
        return res.status(200).json({ data: data, status: true, message: "Total Billing Calculated." });
      } else {
        return res.status(200).send({ "data": null, "status": false, "message": 'No bill generated yet' });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching payment." });
    }
  };

  static getBilling = async (req, res) => {
    try {
      let data = await Payment.getBillingAmount(req.query);
      if (data) {
        return res.status(200).json({ data: data, status: true, message: "Total Billing Calculated." });
      } else {
        return res.status(200).send({ "data": null, "status": false, "message": 'No bill generated yet' });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching payment." });
    }
  };

}

module.exports = PaymentController