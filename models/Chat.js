const {DB} = require("../database/connection");
const User = require("./User");
const moment = require('moment')

var service = {};
service.saveChat = saveChat;
service.getChat = getChat;
service.replyChatByAdmin = replyChatByAdmin;
service.getLatestChat = getLatestChat;
service.getAllChats = getAllChats;
module.exports = service

function saveChat(data) {
    return new Promise(async function (resolve, reject) {
        try {
            //let userData = await User.getUser(`where id=${data?.sender_id}`);
            let adminData = await User.getUser(`where user_type='ADMIN'`);
            let chat_id = data?.chat_id;
            if (data?.chat_id == 0) {
                chat_id = Date.now();
            }

            let sender = data?.sender_id === 0 ? adminData[0]?.id : data?.sender_id;
            let insertqry = `insert into chat (sender_id,receiver_id,chat_id,message,sender_name) VALUES(${sender},${adminData[0]?.id},'${chat_id}','${data?.message}','${data?.sender_name || ''}')`;
            await DB.query(insertqry, async function (error, result) {
                if (error) throw error;

                let chatData = await getChat(`where id = '${result?.insertId}'`);
                chatData[0].chat_date_time = moment(chatData[0].chat_date_time).format('DD-MM-YYYY H:mm:ss');
                resolve(chatData[0] || null);
            })

        } catch (err) {
            reject('error in saving ticket', err);
        }
    });
}

function replyChatByAdmin(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let userData = await User.getUser(`where id='${data?.receiver_id}'`);
            // if (userData[0]?.id) {
            let adminData = await User.getUser(`where user_type='ADMIN'`);
            let chat_id = data?.chat_id;
            let insertqry = `insert into chat (sender_id,receiver_id,chat_id,message) VALUES('${adminData[0]?.id}','${data?.receiver_id}','${chat_id}','${data?.message}')`;
            await DB.query(insertqry, async function (error, result) {
                if (error) throw error;

                let chatData = await getChat(`where id = '${result?.insertId}'`);
                chatData[0].chat_date_time = moment(chatData[0].chat_date_time).format('DD-MM-YYYY H:mm:ss');
                resolve(chatData[0] || null);
            })
            // } else {
            //     reject('Invalid User');
            // }
        } catch (err) {
            reject('error in saving ticket', err);
        }
    });
}

function getChat(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `SELECT * FROM chat ${condition}`;
            DB.query(qry, async function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching chat details by Id', err);
        }
    });
}

function getLatestChat(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `SELECT * FROM chat ${condition}`;
            DB.query(qry, async function (error, results) {
                if (error) throw error;
                if (results[0]) {
                    let updateQry = `update chat set is_read =1 where id=${results[0]?.id}`;
                    DB.query(updateQry, async function (error, results) {
                    });
                }
                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching chat details by Id', err);
        }
    });
}

function getAllChats(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from chat ${condition} `;
            // console.log(qry);
            DB.query(qry, async function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            });
        } catch (err) {
            reject('error in fetching chat details by Id', err);
        }
    });
}