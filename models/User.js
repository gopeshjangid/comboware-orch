const {DB} = require("../database/connection");
const VZ = require("../controllers/VZController");
const VZModel = require("../models/Virtuozzo");
const { use } = require("../routes/User");
const CONFIG = require("../config");
var API = require("../utils");
const utils = require("../utils");
const ejs = require("ejs");
const jwt = require("jsonwebtoken");
const Logger = require("../logger");

var service = {};
service.register = register;
service.getUser = getUser;
service.getUsers = getUsers;
service.getUserByEmail = getUserByEmail;
service.getUserById = getUserById;
service.updateProfile = updateProfile;
service.getProfile = getProfile;
service.adminLogin = adminLogin;
service.getVirtuozzoByUserId = getVirtuozzoByUserId;
service.updateSystemData = updateSystemData;
service.getLogs = getLogs;
service.updateUserPlan = updateUserPlan;
service.updateAdminSetting = updateAdminSetting;
service.getSettings = getSettings;
service.updateUserFields = updateUserFields;
service.createUserinVZ = createUserinVZ;
service.getAuthToken = getAuthToken;
service.saveSkills = saveSkills;
service.saveSkillLevels = saveSkillLevels;
service.getSkillLevels = getSkillLevels;
service.changeSkillLevelStatus = changeSkillLevelStatus;
service.addAdminSetting = addAdminSetting;
service.getAdminSettings = getAdminSettings;
service.manageUserAccount = manageUserAccount;

module.exports = service


function register(data) {
	return new Promise(async function (resolve, reject) {
		try {
			let password = data?.password || '';
			let is_login = data?.is_login || false;

			var userData = await getUser(`where user_type='${data?.user_type}' and email = '${data?.email}'`);
			// console.log(is_login,'userData',userData);
			var userPhone = await getUser(`where phone='${data?.phone}'`);
			// console.log(is_login,'userData',userData);
			var userName = await getUser(`where user_name='${data?.user_name}'`);
			// console.log(is_login,'userData',userData);
			if (!userData[0] && !is_login && !userPhone[0] && !userName[0]) {
				DB.query(`insert into users (email, user_type, first_name,last_name, password) values ('${data?.email}','${data?.user_type}','${data?.first_name}','${data?.last_name}' , '${data?.password}')`, async function (error, results) {
					if (error) throw error;

					let userData = await getUser(`where user_type='${data?.user_type}' and email = '${data?.email}'`);
					delete userData[0]?.password;
					if (userData[0]?.id) {
						const token = jwt.sign(
							{ user_id: userData[0]?.id, email: data?.email },
							process.env.TOKEN_KEY,
							{
								expiresIn: "1h",
							}
						);
						userData[0].token = token;
						const refreshToken = jwt.sign(
							{ user_id: userData[0]?.id, email: data?.email },
							process.env.TOKEN_KEY,
							{
								expiresIn: "30d",
							}
						);
						userData[0].refreshToken = refreshToken;
					}
					return resolve(userData[0] || null);
				})
			} else {
				if(!is_login && userData[0]){
					return reject("You are already registered with us, please sign in.");
				}
				if(is_login && !userData[0]){
					return reject("You are not registered with us, please sign up.");
				}
				if(!is_login && userPhone[0]){
					return reject("Phone number already exist please try with another number.");
				}
				if(!is_login && userName[0]){
					return reject("User name already exist please try with another user name.");
				}
				if (password === userData[0]?.password) {
					delete userData[0]?.password;
					if (userData[0]?.id) {
						const token = jwt.sign(
							{ user_id: data?.id, email: data?.email },
							process.env.TOKEN_KEY,
							{
								expiresIn: "1h",
							}
						);
						userData[0].token = token;
						const refreshToken = jwt.sign(
							{ user_id: data?.id, email: data?.email },
							process.env.TOKEN_KEY,
							{
								expiresIn: "30d",
							}
						);
						userData[0].refreshToken = refreshToken;
					}
					return resolve(userData[0] || null);
				} else {
					return reject("Incorrect Password.");
				}

			}
		} catch (err) {
			reject('error in creating user', err);
		}
	});
}

function getVirtuozzoByUserId(id) {
	return new Promise(function (resolve, reject) {
		try {
			DB.query(`select * from virtuozzo where user_id= ${id}`, function (error, results) {
				if (error) throw error;
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching virtuozzo data', err);
		}
	});
}

function updateProfile(param) {
	return new Promise(async function (resolve, reject) {
		try {
			var data = param?.body;
			var userData = await getUserById(data?.userId);
			// console.log(param.file,'userData',data);return;
			if (!userData[0]) {
				reject('User not exists');
			} else {
				/* let text = utils.REPLACESTR(CONFIG.USER_TEMPLATE, { "{first_name}": data?.first_name, "{url}": CONFIG?.USER_URL, "{domain_name}": "DomainData?.name", "{user_name}": data?.user_name, "{password}": password });
				API.SENDEMAIL({
					email: userData[0]?.email, subject: 'your account has been created on comboware.', text: text
				}); */
				let passwordField = '';
				if (data.password != '') {
					passwordField = `, password = '${data?.password}'`;
				}
				if (data?.skills) {
					let skills = data?.skills;
					if ((typeof skills) === 'string') {
						skills = JSON.parse(skills);
					}
					skills.forEach(skill => {
						if (skill?.id) {
							DB.query(`update customer_skills set skill_name = "${skill?.skill_name}", skill_level = "${skill?.skill_level}" where id = ${skill?.id}`, function (error, results) {
								if (error) throw error;
							})
						} else {
							DB.query(`insert into customer_skills(user_id, skill_name, skill_level) VALUES(${data?.userId}, "${skill?.skill_name}", "${skill?.skill_level}")`, function (error, results) {
								if (error) throw error;
							})
						}

					});
				}

				let profileImageField = '';
				if (param.file && param.file !=undefined) {
					profileImageField = `, profile_image = '${param?.file?.filename}'`
				}
				let query = `update users set first_name = '${data?.first_name}', last_name = '${data?.last_name}', phone = '${data?.phone}', user_name = '${data?.user_name}', company_id = '${data?.company_id}', company_position = '${data?.company_position}', company_name = '${data?.company_name}', company_phone = '${data?.company_phone}', company_address = '${data?.company_address}' ${passwordField} ${profileImageField} where id = ${data?.userId}`;

				// console.log(query);return;

				DB.query(query, async function (error, results) {
					if (error) throw error;

					let senduserData = await getUserById(data?.userId);
					delete senduserData[0]?.password;
					let vzTableData = await getVirtuozzoByUserId(data?.userId);
					return resolve({ "user": senduserData[0] || null, "vz": vzTableData[0] || null });
				})
			}
		} catch (err) {
			reject('error in creating user', err);
		}
	});
}

function createUserinVZ(data,cluster_url){
	return new Promise(async function (resolve, reject) {
		try {
			let vzTableData = await getVirtuozzoByUserId(data?.id);
			let password = Buffer.from(data?.password, 'base64').toString('binary');
			if (!vzTableData[0]?.vz_user_id) {
				let UserCreation = {};
				UserCreation.user = { "domain_id": vzTableData[0]?.domain_id, "default_project_id": vzTableData[0]?.project_id, "enabled": true, "name": data?.user_name, password, description: "New user creation", "email": data?.email }
				let VZData = await VZ.Call(UserCreation, "/v3/users", "POST",false,cluster_url);
				// console.log('vzTableData[0]',vzTableData[0],'vz user data',VZData)
				if (VZData?.data?.user?.id) {
					await DB.query(`update virtuozzo set vz_user_id='${VZData?.data?.user?.id}' where user_id=${data?.id}`, async function (error, results) {
						if (error) throw error;

						await DB.query(`update users set is_profile_setup=1,status=1 where id=${data?.id}`, async function (error, userUpdate) {});
						let roleData = await VZModel.getRoles(vzTableData[0]?.cluster_url);
						var roleId = roleData.map((role) => {
							if (role.name == 'project_admin')
								return role?.id || null;
						}).filter(function (role) { return role; })[0];

						vzTableData = await getVirtuozzoByUserId(data?.id);
						let setRoleData = VZ.Call('', `/v3/projects/${vzTableData[0]?.project_id}/users/${vzTableData[0]?.vz_user_id}/roles/${roleId}`, 'PUT',false,vzTableData[0]?.cluster_url);

						console.log(`/v3/projects/${vzTableData[0]?.project_id}/users/${vzTableData[0]?.vz_user_id}/roles/${roleId}`,'setRoleData',setRoleData)

						let DomainData = await VZModel.getDomainById(vzTableData[0]?.domain_id,vzTableData[0]?.cluster_url);
						const htmlToSend = await ejs.renderFile("./profile.ejs", { firstName: data?.first_name, url: CONFIG?.USER_URL, domainName: DomainData?.name, userName: data?.user_name, password: password });
						API.SENDEMAIL({
							email: data?.email, subject: 'your account has been created on Comboware.', text: htmlToSend
						});
						resolve(true)
					})
				} else {
					let msg = 'Unable to create user on virtuozzo. User profile updated';	
					Logger.logged().error(`request-> url = v3/users, method = POST ,Data = `,JSON.stringify(UserCreation),`response-> ${msg} with error code ${VZData?.data}`);
					resolve(msg)
				}
			}else{
				reject('user already created on vz');
			}
		} catch (err) {
			reject('error in creating user on VZ', err);
		}
	});
}

function getUser(condition) {
	return new Promise(function (resolve, reject) {
		try {
			let qry = `select * from users ${condition}`;
			// console.log(qry);
			DB.query(qry, function (error, results) {
				if (error) throw error;

					resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching user', err);
		}
	});
}

function getUsers() {
	return new Promise(function (resolve, reject) {
		try {
			DB.query(`select * from users`, function (error, results) {
				if (error) throw error;
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching user', err);
		}
	});
}

function getUserByEmail(email) {
	return new Promise(function (resolve, reject) {
		try {
			DB.query(`select * from users where email = '${email}'`, function (error, results) {
				if (error) throw error;
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching user', err);
		}
	});
}

function getUserById(id) {
	return new Promise(function (resolve, reject) {
		try {
			DB.query(`select * from users where id = ${id}`, function (error, results) {
				if (error) throw error;
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching user', err);
		}
	});
}

function getSkillsByUserId(userId) {
	return new Promise(function (resolve, reject) {
		try {
			DB.query(`select * from customer_skills where user_id = ${userId}`, function (error, results) {
				if (error) throw error;
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching virtuozzo data', err);
		}
	});
}

function getProfile(userId) {
	return new Promise(async function (resolve, reject) {
		try {
			/*ejs.renderFile("./profile.ejs", { firstName: 'data?.first_name', url: 'CONFIG?.USER_URL', domainName: 'DomainData?.name', userName: 'data?.user_name', password: 'password' }, function (err, data) {
				if (err) {
					console.log(err);
				} else {
					// console.log(data, '===htmlToSend');
					API.SENDEMAIL({
						email: 'gopesh.jangid@gmail.com', subject: 'your account has been created on comboware.', text: data
					});
				}
			});*/
			let data = {};
			let userData = await getUserById(userId);
			if (userData[0]) {
				delete userData[0]?.password;
				let skillsData = await getSkillsByUserId(userId);
				let vzTableData = await getVirtuozzoByUserId(userId);
				let VZDomain = null;
				let VZProject = null;
				if (vzTableData.length) {
					VZDomain = await VZModel.getDomainById(vzTableData[0]?.domain_id,vzTableData[0]?.cluster_url);
					VZProject = await VZModel.getProjectById(vzTableData[0]?.project_id,vzTableData[0]?.cluster_url);
				}
				data.user = userData[0] || null;
				data.skills = skillsData || null;
				data.domain = VZDomain || null;
				data.project = VZProject || null;
				resolve(data);
			} else {
				resolve(false)
			}
		} catch (err) {
			reject('error in fetching profile', err);
		}
	});
}

function updateSystemData(params) {
	return new Promise(async (resolve, reject) => {
		try {
			let qry = `update users set system_image='${params?.file?.filename}' where id = ${params?.query?.userId}`;
			DB.query(qry, async function (error, results) {
				if (error) throw error;
				let userData = await getUserById(params?.query?.userId);
				delete userData[0]?.password;
				resolve(userData[0] || null);
			});
		} catch (err) {
			reject(err)
		}
	});
}

function adminLogin(param) {
	return new Promise(async function (resolve, reject) {
		try {
			let encPass = Buffer.from(param?.password, 'binary').toString('base64')
			let password = Buffer.from(encPass, 'base64').toString('binary');
			let userData = await getUser(`where user_type = '${param?.user_type}' and email = '${param?.email}' and password = '${param?.password}'`);
			if (userData.length)
				delete userData[0]?.password;

			const token = jwt.sign(
				{ user_id: userData[0]?.id, email: param?.email },
				process.env.TOKEN_KEY,
				{
					expiresIn: "2h",
				}
			);
			if (userData.length)
			  userData[0].token = token;
			resolve(userData[0] || null);
		} catch (err) {
			console.log("err=" ,err)
			reject('error in admin login', err);
		}
	});
}

function getLogs() {
	return new Promise(function (resolve, reject) {
		try {
			DB.query(`select id,log_message,log_level,date_time from logs order by id desc limit 1,50`, function (error, results) {
				if (error) throw error;
				
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching logs');
		}
	});
}

function updateUserPlan(params) {
	return new Promise(async (resolve, reject) => {
		try {
			// let query = `update settings set `;
			// for(let [key,val] of Object.entries(params)){
			// 	query +=`${key}=${val}`;
			// }
			let query = `update users set plan_type = '${params.plan_type}' where id = ${params.userId}`;
			DB.query(query, async function (error, results) {
				if (error) throw error;

				resolve(true);
			});
		} catch (err) {
			reject(err)
		}
	});
}

function updateAdminSetting(params) {
	return new Promise(async (resolve, reject) => {
		try {
			let query,lastKey;
			if(params?.id){
				query = `update settings set `;
				lastKey = Object.keys(params)[Object.keys(params).length-1];
				for(let [key,val] of Object.entries(params)){
					if(key!=lastKey){
						query +=`${key} = '${val}', `;
					}else{
						query +=`${key} = '${val}' `;
					}
				}
				query +=` where id = ${params?.id}`;
			}else{
				query = `insert into settings (plan_type,user_id,user_type) values('${params?.plan_type}','${params?.user_id}','${params?.user_type}');`
			}
			// console.log(lastKey,query);
			DB.query(query, async function (error, results) {
				if (error) throw error;

				resolve(true);
			});
		} catch (err) {
			reject(err)
		}
	});
}


function updateUserFields(params) {
	return new Promise(async (resolve, reject) => {
		try {
			if(params.fields.length){
				let query,lastKey;
				query = `update users set `;
				lastKey = Object.keys(params.fields[0])[Object.keys(params.fields[0]).length-1];
				for(let [key,val] of Object.entries(params.fields[0])){
					if(key!=lastKey){
						query +=`${key} = '${val}', `;
					}else{
						query +=`${key} = '${val}' `;
					}
				}
				query +=` where id = ${params?.userId}`;
				// console.log(lastKey,query);
				DB.query(query, async function (error, results) {
					if (error) throw error;

					resolve(true);
				});
			}else{
				reject('Please send correct information.')
			}
		} catch (err) {
			reject(err)
		}
	});
}

function getSettings(params) {
	return new Promise(function (resolve, reject) {
		try {
			let cond = '';
			if(params?.user_id){
				cond = `where user_id = ${params?.user_id}`
			}
			if(params?.user_type){
				cond = `where user_type = '${params?.user_type}'`
			}

			let qry = `select id,plan_type,user_id,user_type from settings ${cond}`;
			// console.log(qry);
			DB.query(qry, function (error, results) {
				if (error) throw error;
				
				resolve(results || null);
			});
		} catch (err) {
			reject('error in fetching logs');
		}
	});
}

function getAuthToken(params) {
	return new Promise(async function (resolve, reject) {
		try {			
			let userData = await getUser(`where id='${params?.userId}'`);
			
			const token = jwt.sign(
				{ user_id: userData[0]?.id, email: userData[0]?.email },
				process.env.TOKEN_KEY,
				{
					expiresIn: "1h",
				}
			);
			resolve(token || null);
		} catch (err) {
			reject('error in creating auth token');
		}
	});
}

function getSkills(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from skills ${condition}`;
            // console.log(qry);
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching skills', err);
        }
    });
}

function saveSkills(data) {
    return new Promise(async function (resolve, reject) {
        try {
			let checkSkills;
			// if(data?.type==="SKILL"){
			// 	checkSkills = await getSkills(`where skills_name = '${data?.name}'`);
			// }
			// if(data?.type==="LEVEL"){
			// 	checkSkills = await SkillLevels(`where skills_level = '${data?.name}'`);
			// }
           if(true) {
				let insQry;
				if(data?.type==="LEVEL"){
					insQry = `insert into skills_levels (skills_level) VALUES('${data.name}')`;
				} else {
					insQry = `insert into skills (skills_name) VALUES('${data.name}')`;
				}
                // console.log(insQry);
                await DB.query(insQry, async function (error, results) {
                    if (error) throw error;

                    if(data?.type==="SKILL"){
						checkSkills = await getSkills(`where skills_name = '${data?.name}'`);
					}
					if(data?.type==="LEVEL"){
						checkSkills = await SkillLevels(`where skills_level = '${data?.name}'`);
					}
                    resolve(checkSkills && checkSkills.length && checkSkills[0] || null);
                })
            }
        } catch (err) {
            reject('Error in adding skills', err);
        }
    });
}

function SkillLevels(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from skills_levels ${condition}`;
            // console.log(qry);
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
			console.log("----" ,err)
            reject('error in fetching skills level', err);
        }
    });
}

function saveSkillLevels(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let checkSkillLevels = await SkillLevels(`where skills_level = '${data?.skills_level}'`);
            if (checkSkillLevels && checkSkillLevels.length) {
                let updQry = `update skills_levels set skills_level = '${data?.skills_level}' where id= ${checkSkillLevels[0]?.id}`;
                await DB.query(updQry, async function (error, results) {
                    if (error) throw error;

                    let checkSkillLevels = await SkillLevels(`where skills_level = '${data?.skills_level}'`);
                    resolve(checkSkillLevels[0] || null);
                })
            } else {
                let insQry = `insert into skills_levels (skills_level) VALUES('${data.skills_level}')`;
                await DB.query(insQry, async function (error, results) {
                    if (error) throw error;

                    let checkSkillLevels = await SkillLevels(`where skills_level = '${data?.skills_level}'`);
                    resolve(checkSkillLevels[0] || null);
                })
            }
        } catch (err) {
            reject('Error in adding skills levels', err);
        }
    });
}

function getSkillLevels (params) {
    return new Promise(async function (resolve, reject) {
        try {
			let skills = [];
			let levels = [];
			if(params?.type==='SKILL'){
				skills = await getSkills('');
			}
			if(params?.type==='LEVEL'){
				levels = await SkillLevels('');
			}
            resolve({skills,levels})
        } catch (err) {
            reject('error in fetching skills level', err);
        }
    });
}

function changeSkillLevelStatus(param){
	return new Promise(async function(resolve, reject){
		try{
			let delQry;
			if(param?.type==="LEVEL"){
				delQry = `update skills_levels set status = ${param?.status} where id=${param.id}`;
			} else {
				delQry = `update skills set status = ${param?.status} where id = ${param.id}`;
			}
			
			await DB.query(delQry, async function (error, results) {
			    if (error) throw error;

			    resolve(results || null);
			})
		}catch(err){
			console.log(err);
			reject(err);
		}
	})
}

async function getAdminSettings(name=''){
	return new Promise(async (resolve, reject) => {
		try {
			let cond = '';
			if(name && name!=''){
				cond = `where name = "${name}"`;
			}
			let query = `select id,name,value,status from admin_common_settings ${cond}`
			DB.query(query, async function (error, results) {
				if (error) throw error;

				resolve(results);
			});
		}catch(err){
			console.log(err);
			reject(err);
		}
	});
}

function addAdminSetting(params) {
	return new Promise(async (resolve, reject) => {
		try {
			let query,lastKey;
			let adminSetting = await getAdminSettings(params?.name);
			if(params?.id || adminSetting.length){
				let id = params?.id;
				query = `update admin_common_settings set `;
				lastKey = Object.keys(params)[Object.keys(params).length-1];
				for(let [key,val] of Object.entries(params)){
					if(key!=lastKey){
						query +=`${key} = '${val}', `;
					}else{
						query +=`${key} = '${val}' `;
					}
				}
				if(adminSetting.length){
					id = adminSetting[0]?.id
				}
				query +=` where id = ${id}`;
			}else{
				query = `insert into admin_common_settings (name,value) values('${params?.name}','${params?.value}');`
			}
			DB.query(query, async function (error, results) {
				if (error) throw error;

				resolve(true);
			});
		} catch (err) {
			console.log(err);
			reject(err)
		}
	});
}

function manageUserAccount(param){
	return new Promise(async function(resolve, reject){
		try{
			// await DB.query(updQry, async function (error, results) {
			//     if (error) throw error;

			//     resolve(results || null);
			// })
		}catch(err){
			console.log(err);
			reject(err);
		}
	})
}