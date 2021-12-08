const {DB} = require("../database/connection");
const VZ = require("../controllers/VZController");
const User = require("./User");
const CONFIG = require("../config");
var API = require("../utils");
const moment = require('moment');
const ejs = require('ejs');

var service = {};
service.createTicket = createTicket;
service.getTicketDetails = getTicketDetails;
service.updateRequest = updateRequest;
service.getCategories = getCategories;
service.getSubCategories = getSubCategories;
service.addActivities = addActivities;
service.getAllTickets = getAllTickets;
service.assignTicket = assignTicket;

module.exports = service

function createTicket(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let adminData = await User.getUser(`where user_type='ADMIN'`);
            let insertqry = `insert into tickets (user_id, ticket_category, ticket_subcategory, ticket_subject, assignee_id) VALUES(${data?.userId}, ${data?.category_id}, ${data?.subcategory_id}, '${data?.ticket_subject}', ${adminData[0]?.id})`;
            await DB.query(insertqry, async function (error, result) {
                if (error) throw error;

                var id = result?.insertId;
                var ticketNumber = `CW-${data?.userId}-${id}`;
                let qry = `update tickets set ticket_number = '${ticketNumber}' where id= ${id}`;
                DB.query(qry, async function (error, result) {
                    if (error) throw error;

                    let ticketData = await getTicketDetailById(`where id = ${id}`);
                    resolve(ticketData[0] || null);
                });
            })
        } catch (err) {
            reject('error in creating ticket', err);
        }
    });
}

function getTicketDetailById(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `SELECT * FROM tickets ${condition}`;
            // console.log(qry);
            DB.query(qry, async function (error, results) {
                if (error) throw error;

                return resolve(results);
            })
        } catch (err) {
            reject('error in fetching ticket by Id', err);
        }
    });
}

function getTicketDetails(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `SELECT * FROM tickets ${condition}`;
            DB.query(qry, async function (error, results) {
                if (error) throw error;

                let ta = await getActivitiesWithUserInfo(`select ta.*, users.first_name, users.last_name from ticket_activities as ta inner join users on users.id = ta.user_id where ta.ticket_number='${results[0]?.ticket_number}'`);
                let ticket = { ticket: results, activities: ta };
                return resolve(ticket);
            })
        } catch (err) {
            reject('error in fetching ticket', err);
        }
    });
}

function getAllTickets(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `SELECT t.*,users.*,c.category_name,sc.subcategory_name FROM tickets t inner join users on t.user_id = users.id inner join category c on t.ticket_category = c.id inner join subcategory sc on t.ticket_subcategory = sc.id ${condition}`;
            DB.query(qry, async function (error, results) {
                if (error) throw error;

                return resolve(results);
            })
        } catch (err) {
            reject('error in fetching ticket', err);
        }
    });
}

function updateRequest(params) {
    return new Promise(async function (resolve, reject) {
        try {
            let data = params?.body;
            let query = params?.query;
            let userData = await User.getUserById(query?.userId);
            if (userData[0]) {
                let checkUserTicket = await getTicketDetailById(`where ticket_number = '${query?.ticketNumber}'`);
                if (checkUserTicket && checkUserTicket.length) {
                    // let adminData = await User.getUser(`where user_type='ADMIN'`);
                    // if (adminData[0].id === data.assignee_id) {
                    let ticket_processing_date = '';
                    let ticket_completion_date = '';
                    if (data?.repair_status == 'PROCESSING') {
                        ticket_processing_date = `, ticket_status = 'PROCESSING', ticket_processing_date = '${moment().format("YYYY-MM-DD H:mm:ss")}'`;
                    }
                    if (data?.repair_status == 'REPAIRED' || data?.repair_status == 'FAILED') {
                        ticket_completion_date = `, assignee_id = ${checkUserTicket[0]?.user_id}, ticket_status = 'CLOSED', ticket_completion_date = '${moment().format("YYYY-MM-DD H:mm:ss")}'`;
                    }

                    let updateqry = `update tickets set ticket_category =${data?.category_id}, ticket_subcategory = ${data?.subcategory_id}, ticket_subject = '${data?.ticket_subject}', repair_status = '${data?.repair_status}' ${ticket_processing_date} ${ticket_completion_date} where ticket_number = '${query?.ticketNumber}'`;
                    DB.query(updateqry, async function (error, results) {
                        if (error) throw error;

                        let ticketUser = await User.getUserById(checkUserTicket[0]?.user_id);
                        const htmlToSend = await ejs.renderFile("./updateTicket.ejs", { firstName: ticketUser[0]?.first_name, ticketStatus: checkUserTicket[0]?.ticket_status, ticketNumber: query?.ticket_number, ticketSubject: checkUserTicket[0]?.ticket_subject, ticketRepairStatus: checkUserTicket[0]?.repair_status, assigneeId: query?.userId });
                        API.SENDEMAIL({
                            email: userData[0]?.email, subject: 'Your ticket status has been updated.', text: htmlToSend
                        });
                        return resolve(true);
                    })

                    // }else{
                    //     reject('Ticket not assigned to you')
                    // }
                } else {
                    return reject('Invalid Ticket');
                }
            } else {
                reject('Invalid User')
            }
        } catch (err) {
            reject('error in updating ticket request status', err);
        }
    });
}

function addActivities(params) {
    return new Promise(async function (resolve, reject) {
        try {
            let data = params?.body;
            let activities = [];
            if (data?.activities) {
                activities = data?.activities;

                if ((typeof activities) === 'string') {
                    activities = JSON.parse(activities);
                }

                if (params?.file) {
                    let imgObj = {};
                    imgObj.type = 'IMAGE';
                    imgObj.content = params?.file?.filename;
                    activities.push(imgObj);
                }

                activities.forEach(async (activity) => {
                    activity.userId = params?.query?.userId;
                    activity.ticket_number = params?.query?.ticketNumber;
                    await saveActivities(activity);
                });

                let activityData = await getActivities(`where user_id = ${params?.query?.userId} and ticket_number= '${params?.query?.ticketNumber}' order by id desc`);
                resolve(activityData);
            } else {
                if (params.file) {
                    let imgObj = {};
                    imgObj.type = 'IMAGE';
                    imgObj.content = params?.file?.filename;
                    activities.push(imgObj);
                }

                activities.forEach(async (activity) => {
                    activity.userId = params?.query?.userId;
                    activity.ticket_number = params?.query?.ticketNumber;
                    await saveActivities(activity);
                });

                // let activityData = await getActivities(`where user_id = ${params?.query?.userId} and ticket_number= '${params?.query?.ticketNumber}' order by id desc`);
                let activityData = await getActivitiesWithUserInfo(`select ta.*, users.first_name, users.last_name from ticket_activities as ta inner join users on users.id = ta.user_id where ta.ticket_number='${results[0]?.ticket_number}' order by id desc`);
                resolve(activityData);
            }
        } catch (err) {
            reject('error in creating ticket activities', err);
        }
    });
}

function getActivities(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from ticket_activities ${condition}`;
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching category', err);
        }
    });
}


function getActivitiesWithUserInfo(qry) {
    return new Promise(async function (resolve, reject) {
        try {
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching category', err);
        }
    });
}

function saveActivities(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let actQry = `insert into ticket_activities (user_id, ticket_number, type, content) VALUES(${data?.userId}, '${data?.ticket_number}','${data?.type}','${data?.content}')`;
            DB.query(actQry, function (error, results) {
                if (error) throw error;

                return resolve(true);
            })
        } catch (err) {
            reject('error in saving ticket activity', err);
        }
    });
}

function getCategories() {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from category`;
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching category', err);
        }
    });
}

function getSubCategories(id) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from subcategory where category_id=${id}`;
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching category', err);
        }
    });
}

function assignTicket(params) {
    return new Promise(async function (resolve, reject) {
        try {
            let data = params?.body;
            let userData = await User.getUserById(data?.userId);
            if (userData[0]) {
                let checkUserTicket = await getTicketDetailById(`where ticket_number = '${data?.ticket_number}'`);
                if (checkUserTicket && checkUserTicket.length) {
                    let updateqry = `update tickets set assignee_id =${data?.userId} where ticket_number = '${data?.ticket_number}'`;
                    DB.query(updateqry, async function (error, results) {
                        if (error) throw error;

                        let ticketUser = await User.getUserById(checkUserTicket[0]?.user_id);
                        const htmlToSend = await ejs.renderFile("./ticket.ejs", { firstName: ticketUser[0]?.first_name, ticketNumber: data?.ticket_number, ticketStatus: checkUserTicket[0]?.ticket_status, assigneeName: userData[0]?.first_name, assigneeId: data?.userId });
                        // console.log(htmlToSend);
                        API.SENDEMAIL({
                            email: ticketUser[0]?.email, subject: 'Your ticket has been assigned.', text: htmlToSend
                        });
                        
                        const htmlToSendAssignee = await ejs.renderFile("./ticketAssigned.ejs", { firstName: userData[0]?.first_name, ticketNumber: data?.ticket_number, ticketStatus: checkUserTicket[0]?.ticket_status});
                        // console.log(htmlToSend);
                        API.SENDEMAIL({
                            email: userData[0]?.email, subject: 'A ticket has been assigned to you.', text: htmlToSendAssignee
                        });

                        return resolve(true);
                    })
                } else {
                    return reject('Invalid Ticket');
                }
            } else {
                reject('Invalid User')
            }
        } catch (err) {
            reject('error in updating ticket request status', err);
        }
    });
}