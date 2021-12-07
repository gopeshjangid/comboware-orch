const {DB} = require("../database/connection");
const VZ = require("../controllers/VZController");
const User = require("./User");
const CONFIG = require("../config");
var API = require("../utils");
const moment = require("moment");
const ejs = require("ejs");

var service = {};
service.savePayment = savePayment;
service.getAllPayments = getAllPayments;
service.getPayment = getPayment;
service.getBillingAmount = getBillingAmount;

module.exports = service;

function savePayment(data) {
	return new Promise(async function (resolve, reject) {
		try {
			let userData = await User.getUser(`where id=${data?.userId}`);
			if (userData[0]?.id) {
				// let insertqry = `insert into payment_details (user_id, payment_id, reference_id, payer_id, payent_token, amount, payment_status, payment_description, payment_code) VALUES(${data.userId}, '${payment_id}' ,'${data.reference_id}','${data.payer_id}','${data.payent_token}',${data.amount},'${data.payment_status}','${data.payment_description}','${data.payment_code}')`;

				let end_date = moment().toISOString();
				let is_paid = 0;
				if (data?.payment_status === "COMPLETED") {
					is_paid = 1;
				}
				let updateqry = `update payment_details set user_id = ${data?.userId},reference_id= '${data?.reference_id}', payer_id = '${data?.payer_id}', payent_token = '${data?.payent_token}', amount = ${data?.amount}, payment_status = '${data?.payment_status}',payment_date = '${end_date}',payment_description = '${data?.payment_description}',payment_code = '${data?.payment_code}', is_paid=${is_paid} where payment_id='${data?.payment_id}' `;
				await DB.query(updateqry, async function (error, result) {
					if (error) throw error;

					let PaymentData = await getPayment(
						`where payment_id = '${data?.payment_id}'`
					);
					const htmlToSend = await ejs.renderFile("./payment.ejs", {
						firstName: userData[0]?.first_name,
						paymentId: data?.payment_id,
						amount: data?.amount,
						status: data?.payment_status,
					});
					API.SENDEMAIL({
						email: userData[0]?.email,
						subject: "Your payment status.",
						text: htmlToSend,
					});
					resolve(PaymentData[0] || null);
				});
			} else {
				reject("Invalid User");
			}
		} catch (err) {
			reject("error in saving ticket", err);
		}
	});
}

function getPayment(condition) {
	return new Promise(async function (resolve, reject) {
		try {
			let qry = `SELECT * FROM payment_details ${condition}`;
			DB.query(qry, async function (error, results) {
				if (error) throw error;

				return resolve(results || []);
			});
		} catch (err) {
			reject("error in fetching payment details by Id", err);
		}
	});
}

function getAllPayments() {
	return new Promise(async function (resolve, reject) {
		try {
			let where = data?.userId ? ` where user_id =${data?.userId}` : "";
			let qry = `SELECT id, user_id, payment_id, amount, payment_status, payment_description, payment_code, payment_date FROM payment_details ${where}`;
			DB.query(qry, async function (error, results) {
				if (error) throw error;

				return resolve(results);
			});
		} catch (err) {
			reject("error in fetching payment details by Id", err);
		}
	});
}

async function calculateBillingAmount(userId, date) {
	return new Promise(async function (resolve, reject) {
		try {
			let totalDays = moment(date).daysInMonth();
			let dateNumber = moment(date).date();
			const days = totalDays - dateNumber;
			console.log("days", days);
			// const days
			let userTableData = await User.getUser(`where id=${userId}`);
			let cpu =
				userTableData[0]?.plan_type == "FIXED"
					? CONFIG.QUOTA_CORES || 0
					: userTableData[0]?.plan_type == "UNLIMITED"
						? res?.data?.flavor?.vcpus || 0
						: 0;
			let memory =
				userTableData[0]?.plan_type == "FIXED"
					? CONFIG.QUOTA_RAM / 1024 || 0
					: userTableData[0]?.plan_type == "UNLIMITED"
						? res?.data?.flavor?.ram || 0
						: 0;
			let volume =
				userTableData[0]?.plan_type == "FIXED"
					? CONFIG.VOLUME_SIZE || 0
					: userTableData[0]?.plan_type == "UNLIMITED"
						? res?.data?.flavor?.disk || 0
						: 0;
            /* let resourceData = await getResource(userTableData[0]?.plan_type);
            resourceData = JSON.parse(resourceData?.resource_config);
            // console.log('start',resourceData.RAM,resourceData.CPU,resourceData.VOLUME,'end');return;
            let cp = resourceData?.CPU || 0;
            let mp = resourceData?.RAM || 0;
            let vp = resourceData?.VOLUME || 0; */
			let cp = (await getResource("CPU")) || 0;
			let mp = (await getResource("RAM")) || 0;
			let vp = (await getResource("VOLUME")) || 0;
			let total = parseFloat(cp * cpu + mp * memory + vp * volume).toFixed(2);
			let oneDay = parseFloat(total / totalDays).toFixed(2);
			console.log("oneDay", oneDay, "total=>", total);
			let totalAmt = parseFloat(oneDay * days).toFixed(2);
			resolve(totalAmt);
		} catch (e) {
			reject("Error in calculating amount.");
		}
	});
}

function getEndDate(billing_start_date) {
	const end_date =
		moment(billing_start_date).month() === moment().month()
			? moment()
			: moment(billing_start_date).endOf("month");
	return end_date.format("DD-MM-YYYY");
}

async function getBIllingData(billingId, user_id = 0) {
	const cond = user_id
		? `user_id=${user_id} and is_paid=0`
		: `id=${billingId} and is_paid=0`;
	let PaymentData = await getPayment(`where ${cond}`);
	if (PaymentData.length) {
		PaymentData[0].payment_date = API.DATE_FORMATTER(
			PaymentData[0]?.payment_date,
			"DD-MM-YYYY H:mm:ss"
		);
		let start_date = moment(PaymentData[0]?.billing_start_date).format(
			"DD-MM-YYYY"
		);
		return {
			...PaymentData[0],
			start_date,
			end_date: getEndDate(PaymentData[0]?.billing_start_date),
			is_paid: PaymentData[0]?.is_paid,
			modified_on: moment(PaymentData[0]?.modified_on).format(
				"DD-MM-YYYY HH:mm:ss"
			),
		};
	} else {
		return null;
	}
}

function getBillingAmount(data) {
	return new Promise(async function (resolve, reject) {
		try {
			let userData = await getWorkspaceDetails(`where user_id=${data.userId}`);
			const server_creation_date = userData.length
				? moment(userData[0].server_creation_date)
				: moment();

			if (userData.length === 0 || userData.length && userData[0].request_status === 'OPEN') {
				return resolve(null);
			}

			let billingDetails = await getPayment(
				`where user_id = ${data?.userId} order by id desc limit 1`
			);

			let is_payable = false;
			if (billingDetails.length) {
				let bill = billingDetails[0];
				let billId = bill?.id || 0;
				if (!bill?.is_paid) {
					const amount = await calculateBillingAmount(
						data?.userId,
						bill?.billing_start_date
					);
					if (bill?.amount !== amount) {
						resData = await updateBilling(amount, billingDetails[0]?.id);
					}
					is_payable = moment().isAfter(
						moment(bill?.billing_start_date).endOf("month")
					);
				} else {
					const billing_start_date = moment().startOf("month");
					const amount = await calculateBillingAmount(
						data?.userId,
						billing_start_date
					);
					billId = await insertBilling(
						data?.userId,
						amount,
						billing_start_date.month() + 1,
						billing_start_date.year(),
						billing_start_date.format("YYYY-MM-DD")
					);
				}
				const billsDetails = await getBIllingData(billId, 0);
				billsDetails.is_payable = is_payable;
				resolve(billsDetails);
			} else {
				const billing_start_date = server_creation_date;
				is_payable = moment().isAfter(
					moment(billing_start_date).endOf("month")
				);
				const amount = await calculateBillingAmount(
					data?.userId,
					billing_start_date
				);

				billId = await insertBilling(
					data?.userId,
					amount,
					billing_start_date.month() + 1,
					billing_start_date.year(),
					billing_start_date.format("YYYY-MM-DD")
				);
				const billsDetails = await getBIllingData(billId);
				billsDetails.is_payable = is_payable;

				if (billsDetails) {
					resolve(billsDetails);
				} else {
					resolve("No bill generated yet");
				}
			}
		} catch (e) {
			console.error("Error in get billing amount =>", e);
			reject("Error in fetching billing amount");
		}
	});
}

function insertBilling(
	userId,
	totalAmt,
	currentMonth,
	currentYear,
	billing_start_date
) {
	return new Promise(async function (resolve, reject) {
		try {
			let payment_id = Date.now();
			console.log("billing_start_date", billing_start_date);
			let insertqry = `insert into payment_details (user_id, amount,billing_start_date, billing_month,billing_year, payment_id) VALUES(${userId}, ${totalAmt}, '${billing_start_date}',${currentMonth},${currentYear}, '${payment_id}')`;
			await DB.query(insertqry, async function (error, result) {
				if (error) throw error;
				resolve(result.insertId);
			});
		} catch (err) {
			reject(err);
		}
	});
}

function updateBilling(totalAmt, id) {
	return new Promise(async function (resolve, reject) {
		try {
			let updateqry = `update payment_details set  amount = ${totalAmt} where id = ${id}`;
			await DB.query(updateqry, async function (error, result) {
				if (error) throw error;
				return resolve(true);
			});
		} catch (err) {
			reject(err);
		}
	});
}

function getWorkspaceDetails(condition) {
	return new Promise(async function (resolve, reject) {
		try {
			let qry = `select * from workspace ${condition}`;
			DB.query(qry, function (error, results) {
				if (error) throw error;

				return resolve(results || null);
			});
		} catch (err) {
			reject("error in fetching workspace", err);
		}
	});
}

function sumcalculation(data, p) {
	return new Promise(async function (resolve, reject) {
		try {
			var cpusum = (r, a) => r.map((b, i) => a[i] + b);
			let s = data.reduce(cpusum);
			let seconds = parseInt(s[1] / data.length);
			let size = parseInt(s[2] / data.length);
			return resolve(size);
		} catch (err) {
			reject("error in calculation", err);
		}
	});
}

function getCpuUsage(start, end, pid) {
	return new Promise(async function (resolve, reject) {
		try {
			let cpu = {
				operations: "(aggregate sum (metric vcpus mean))",
				search: `project_id=${pid}`,
				resource_type: "instance",
			};
			let res = await VZ.Call(
				cpu,
				`/v1/aggregates?details=False&needed_overlap=0.0&start=${start}&stop=${end}`,
				"POST",
				"metric"
			);
			if (res?.data?.measures?.aggregated) {
				return resolve(res?.data?.measures?.aggregated);
			}
			return resolve(false);
		} catch (err) {
			reject("error in fetching billinh cpu", err);
		}
	});
}

function getMemoryUsage(start, end, pid) {
	return new Promise(async function (resolve, reject) {
		try {
			let memory = {
				operations: "(aggregate sum (metric memory mean))",
				search: `project_id=${pid}`,
				resource_type: "instance",
			};
			let res = await VZ.Call(
				memory,
				`/v1/aggregates?details=False&needed_overlap=0.0&start=${start}&stop=${end}`,
				"POST",
				"metric"
			);
			if (res?.data?.measures?.aggregated) {
				return resolve(res?.data?.measures?.aggregated);
			}
			return resolve(false);
		} catch (err) {
			reject("error in fetching billinh memory", err);
		}
	});
}

function getStorageUsage(start, end, pid) {
	return new Promise(async function (resolve, reject) {
		try {
			let volume = {
				operations: "(aggregate sum (metric volume.size mean))",
				search: `project_id=${pid}`,
				resource_type: "volume",
			};
			let res = await VZ.Call(
				volume,
				`/v1/aggregates?details=False&needed_overlap=0.0&start=${start}&stop=${end}`,
				"POST",
				"metric"
			);
			if (res?.data?.measures?.aggregated) {
				return resolve(res?.data?.measures?.aggregated);
			}
			return resolve(false);
		} catch (err) {
			reject("error in fetching billinh volume", err);
		}
	});
}

function getResource(rtype) {
	return new Promise(function (resolve, reject) {
		try {
			let qry = `select * from resource_quotation where resource_type = '${rtype}'`;
			DB.query(qry, function (error, result) {
				if (error) throw error;

				return resolve(result[0]?.price_per_size || 0);
				// return resolve(result[0] || 0);
			});
		} catch (err) {
			reject(err);
		}
	});
}