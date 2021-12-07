
var axios = require('axios');
var config = require('./config.js');
require("dotenv").config();
const nodemailer = require('nodemailer');
const moment = require('moment');
const {DB} = require("./database/connection");
module.exports = {
	POST: async (url, data, headers) => {
		// console.log("data---post", data)
		return await axios.post(url, data, headers)
	},

	GET: (url, headers) => {
		// console.log("url", url)
		return axios.get(url, headers)
	},

	PUT: (url, data, headers) => {
		return axios.put(url, data, headers)
	},
	DELETE: () => {

	},


	SENDEMAIL: (data) => {
		// console.log("process.env.EMAIL_TYPE===" ,process.env)
		var transporter = nodemailer.createTransport({
			service: process.env.EMAIL_TYPE,
			host: 'smtp.gmail.com',
			auth: {
				user: process.env.FROM_EMAIL,
				pass: process.env.EMAIL_PASS
			}
		});

		var mailOptions = {
			from: process.env.FROM_EMAIL,
			to: data.email,
			subject: data.subject,
			html: data.text
		};

		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				console.log(error);
				return error
			} else {
				console.log('Email sent: ' + info.response);
				return true;
			}
		});
	},

	REPLACESTR: (str, obj) => {
		if (typeof str !== 'string') {
			return false;
		}
		arr = Object.keys(obj);
		// return str.replace(/{first_name}|{url}|{domain_name}|{user_name}|{password}/gi, function (matched) {
		// 	return obj[matched];
		// });
		return str.replace(/({\d})/g, function (i) {
			return arr[i.replace(/{/, '').replace(/}/, '')];
		});
	},

	DATE_FORMATTER: (date, format) => {
		format = "MMM-DD-YYYY HH:mm:ss"
		if (date && format) {
			return moment(date).format(format);
		} else {
			return;
		}
	},

	getAnyTableData: async (tableName, cond) => {
		return new Promise(async (resolve, reject) => {
			try {
				let qry = `select * from ${tableName} ${cond}`;
				// console.log('util query',qry);
				DB.query(qry, function (error, results) {
					if (error) throw error;
						resolve ( results || null);
				})
			}
			catch(err){
				reject(err)
			}
		});		
	}
}
