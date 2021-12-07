const {DB} = require("../database/connection");
const VZ = require("../controllers/VZController");
const User = require("../models/User");
const VZModel = require("../models/Virtuozzo");
const CONFIG = require("../config");
const ejs = require("ejs");
var API = require("../utils");
const Logger = require("../logger");

var service = {};
service.createWorkspace = createWorkspace;
service.getWorkspaceDetails = getWorkspaceDetails;
service.updateRequest = updateRequest;
service.getServerDetails = getServerDetails;
service.addResourceQuotation = addResourceQuotation;
service.getResQuoteDetails = getResQuoteDetails;
service.getAllHosts = getAllHosts;
service.getAllDomains = getAllDomains;
service.getAllvms = getAllvms;
service.extendTrialTime = extendTrialTime;
service.blockVM = blockVM;
service.getHostAutomatic = getHostAutomatic;
service.getClusterById = getClusterById;
service.saveHost = saveHost;
service.saveCluster = saveCluster;
service.getCluster = getCluster;
service.getClustersTableData = getClustersTableData;
service.saveEnvPlan = saveEnvPlan;
service.getEnvPlanDetails = getEnvPlanDetails;

module.exports = service

function createWorkspace(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let userData = await User.getUserById(data?.userId);
            if (userData[0]) {
                let checkUserWorkspace = await getWorkspaceDetails(`where user_id = ${data?.userId}`);
                if (checkUserWorkspace && checkUserWorkspace.length) {
                    return resolve(checkUserWorkspace[0] || null);
                } else {
                    await DB.query(`insert into workspace (user_id, server_name, cpu, ram, capacity, flavorRef, imageRef, uuid, fixed_ip,request_status) VALUES(${data?.userId}, '${data?.server.server_name}', '${data?.server?.cpu}', '${data?.server?.ram}', '${data?.server?.capacity}', '${data?.flavorRef}', '${data?.imageRef}', '${data?.networks?.uuid}', '${data?.networks?.fixed_ip}' , 'OPEN')`, async function (error, results) {
                        if (error) throw error;

                        let workspaceData = await getWorkspaceDetails(`where user_id = ${data?.userId}`);
                        resolve(workspaceData[0] || null);
                    })
                }
            } else {
                resolve(false)
            }
        } catch (err) {
            reject('error in creating workspace', err);
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
            })
        } catch (err) {
            reject('error in fetching workspace', err);
        }
    });
}

function updateRequest(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let userData = await User.getUserById(data?.userId);
            if (userData[0]) {
                let checkUserWorkspace = await getWorkspaceDetails(`where user_id = ${data?.userId} and id = ${data?.workspaceId}`);
                if (checkUserWorkspace && checkUserWorkspace.length) {
                    let vzTableData = await User.getVirtuozzoByUserId(data?.userId);
                    if (!vzTableData[0]?.server_id) {
                        // console.log('dddddd',vzTableData[0]?.project_id);
                        let projectData = await VZModel.getProjectById(vzTableData[0]?.project_id,vzTableData[0]?.cluster_url);
                        if (projectData?.name) {
                            let password = Buffer.from(userData[0]?.password, 'base64').toString('binary');
                            let clusterInfo = await getCluster(` where cluster_url='${vzTableData[0]?.cluster_url}'`);
                            let vmData = {
                                user: {
                                    tokenType: "user",
                                    domainId: vzTableData[0]?.domain_id,
                                    projectName: projectData?.name,
                                    userName: userData[0]?.user_name,
                                    password: password
                                },
                                server: {
                                    name: checkUserWorkspace[0]?.server_name,
                                    adminPass: password,
                                    imageRef: clusterInfo.cluster_image_ref,
                                    flavorRef: clusterInfo.cluster_flavor_ref,
                                    networks: [{ uuid: clusterInfo.cluster_uuid }],
                                    "OS-DCF:diskConfig": "AUTO",
                                    "metadata": {
                                        "My Server Name": checkUserWorkspace[0]?.server_name
                                    },
                                    block_device_mapping_v2: [{
                                        boot_index: 0,
                                        uuid: clusterInfo.cluster_image_ref,
                                        source_type: 'image',
                                        volume_size: CONFIG.VOLUME_SIZE,
                                        destination_type: CONFIG.DESTINATION_TYPE,
                                        delete_on_termination: false
                                    }]
                                }
                            };
                            if(vzTableData[0]?.cluster_url){
                                let VZServerData = await VZ.Call(vmData, "/servers", "POST", true, vzTableData[0]?.cluster_url);
                                console.log('VM Creation',VZServerData?.data);
                                if (VZServerData?.data) {
                                    DB.query(`update virtuozzo set server_id='${VZServerData?.data?.server?.id}', adminPass = '${VZServerData?.data?.server?.adminPass}' where user_id=${data?.userId}`, async function (error, results) {
                                        if (error) throw error;

                                        let userData = await User.getUserById(data?.userId);
                                        let date = new Date().toJSON().slice(0, 10).replace(/-/g, '-');
                                        DB.query(`update workspace set server_creation_date = "${date}", billing_start_date = '${date}', request_status = '${data?.requestStatus}' where user_id =${data?.userId} and id = ${data?.workspaceId}`, async function (err, result) {
                                            if (err) throw err;

                                            let trialDate = new Date(new Date().setDate(new Date().getDate() + 7))
                                                .toJSON().slice(0, 10).replace(/-/g, '-');
                                            DB.query(`update users set trial_expire_date='${trialDate}'  where id = ${data?.userId}`);
                                            const htmlToSend = await ejs.renderFile("./request.ejs", { firstName: data?.first_name, url: clusterInfo[0]?.cluster_admin_url, requestStatus: data?.requestStatus });
                                            API.SENDEMAIL({
                                                email: userData[0]?.email, subject: 'your workspace request has been updated on Comboware.', text: htmlToSend
                                            });
                                            return resolve(checkUserWorkspace[0] || null);
                                        });
                                    });
                                }else{
                                    return resolve('No Cluster information found');
                                }
                            } else {
                                let msg = 'server creation failed';
                                Logger.logged().error(`request-> url = /servers, method = POST ,Data = `, JSON.stringify(vmData), `response-> ${msg} with error code ${VZServerData?.data}`);
                                return resolve(msg);
                            }
                        } else {
                            resolve('project details not found.');
                        }
                    } else {
                        return resolve(checkUserWorkspace[0] || null);
                    }
                } else {
                    return reject('Invalid Workspace');
                }
            } else {
                resolve(false)
            }
        } catch (err) {
            console.log('error in updating workspace request status', err);
            reject('error in updating workspace request status', err);
        }
    });
}

function getServerDetails(userId) {
    return new Promise(async function (resolve, reject) {
        try {
            let userData = await User.getUserById(userId);
            if (userData[0]) {
                let data = {};
                let vzTableData = await User.getVirtuozzoByUserId(userId);
                let workspaceTableData = await getWorkspaceDetails(`where user_id = ${userId} `);
                if (workspaceTableData[0]) {
                    let VZServerData = await VZ.Call('', `/servers/${vzTableData[0]?.server_id}`, "GET", true);
                    data.workspace = workspaceTableData[0] || null;
                    if (VZServerData?.data?.server) {
                        data.server = { server_id: vzTableData[0]?.server_id, status: VZServerData?.data?.server?.status, vm_status: VZServerData?.data?.server["OS-EXT-STS:vm_state"], progress: VZServerData?.data?.server?.progress }
                    } else {
                        let msg = 'No details found';
                        Logger.logged().error(`request-> url = /servers/${vzTableData[0]?.server_id}, method = GET ,Data = '' , response-> ${msg} with error code ${VZServerData?.data}`);
                        data.server = null;
                    }
                    resolve(data);
                } else {
                    return resolve('data is not availbel');
                }
            } else {
                resolve(false)
            }
        } catch (err) {
            reject('error in fetching  server details', err);
        }
    });
}


function addResourceQuotation1(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let checkResQuote = await getResQuoteDetails(`where resource_type = '${data?.resource_type}'`);
            if (checkResQuote && checkResQuote.length) {
                let price_per_size = parseFloat(data.price / data.size);
                let updQry = `update resource_quotation set size = ${data?.size}, price = ${data?.price}, price_per_size=${price_per_size}  where id= ${checkResQuote[0]?.id}`;
                await DB.query(updQry, async function (error, results) {
                    if (error) throw error;

                    let checkResQuote = await getResQuoteDetails(`where resource_type = '${data?.resource_type}' and size=${data?.size}`);
                    resolve(checkResQuote[0] || null);
                })
            } else {
                let price_per_size = parseFloat(data.price / data.size);
                let insQry = `insert into resource_quotation (resource_type, size, price, price_per_size) VALUES('${data?.resource_type}', ${data?.size}, ${data?.price}, ${price_per_size})`;
                await DB.query(insQry, async function (error, results) {
                    if (error) throw error;

                    let checkResQuote = await getResQuoteDetails(`where resource_type = '${data?.resource_type}' and size=${data?.size}`);
                    resolve(checkResQuote[0] || null);
                })
            }
        } catch (err) {
            reject('Error in adding Resource Quotation', err);
        }
    });
}

function addResourceQuotation(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let checkResQuote = await getResQuoteDetails(`where resource_type = '${data?.resource_type}'`);
            if (checkResQuote && checkResQuote.length) {
                // let price_per_size = parseFloat(data.price / data.size);
                let resource_config = JSON.stringify(data?.resource_config);
                let updQry = `update resource_quotation set resource_config = '${resource_config}' where id= ${checkResQuote[0]?.id}`;
                // console.log(updQry);
                await DB.query(updQry, async function (error, results) {
                    if (error) throw error;

                    let checkResQuote = await getResQuoteDetails(`where resource_type = '${data?.resource_type}'`);
                    resolve(checkResQuote[0] || null);
                })
            } else {
                // let price_per_size = parseFloat(data.price / data.size);
                let resource_config = JSON.stringify(data?.resource_config);
                let insQry = `insert into resource_quotation (resource_type, resource_config) VALUES('${data.resource_type}','${resource_config}')`;
                // console.log(insQry);
                await DB.query(insQry, async function (error, results) {
                    if (error) throw error;

                    let checkResQuote = await getResQuoteDetails(`where resource_type = '${data?.resource_type}'`);
                    resolve(checkResQuote[0] || null);
                })
            }
        } catch (err) {
            reject('Error in adding Resource Quotation', err);
        }
    });
}

function getResQuoteDetails(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from resource_quotation ${condition}`;
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching workspace', err);
        }
    });
}

function getAllHosts1() {
    return new Promise(async function (resolve, reject) {
        try {
            let VZHostData = await VZ.Call('', `/os-hypervisors`, "GET", true, '');
            let resultData = VZHostData?.data;
            // console.log('hostDetails',VZHostData?.data);
            if (resultData?.hypervisors) {
                if (resultData?.hypervisors.length) {
                    // let hostDetails = await getHostDetails();
                    // console.log('hostDetails',hostDetails?.data);
                    // let data = [];
                    // resultData?.hypervisors.forEach((element) => {
                    //     delete element.cpu_info;
                    //     data.push(element)
                    // });
                    resolve(resultData?.hypervisors);
                } else {
                    Logger.logged().error(`request-> url = /os-hypervisors/detail, method = GET ,Data = '' , response-> No host found`);
                    return resolve([]);
                }
            } else {
                Logger.logged().error(`request-> url = /os-hypervisors/detail, method = GET ,Data = '' , response-> No hosts found`)
                resolve([])
            }
        } catch (err) {
            console.log(err);
            let msg = 'error in fetching hosts';
            Logger.logged().error(`request-> url = /servers, method = GET ,Data = '' , response-> ${msg}`);
            reject(msg);
        }
    });
    /*return new Promise(async function (resolve, reject) {
        try {
            let hostTableData = await getHostTableData();
            let hyperIds = hyperIps = [];
            hostTableData.forEach((element) => {
                hyperIds.push(element?.host_id);
                hyperIps.push(element?.host_ip);
            });
            let hostsData = await getHostDetailsById(hyperIds, hyperIps ,false)
            resolve(hostsData || null)            
        } catch (err) {
            let msg = 'error in fetching hosts';
            Logger.logged().error(`request-> url = /servers, method = GET ,Data = '' , response-> ${msg}`);
            reject(msg);
        }
    });*/
}

async function getHostDetailsById(hyperIds, hyperIps, isMultiple = false) {
    return new Promise(async function (resolve, reject) {
        try {
            if (isMultiple) {
                let finalHosts = [];
                for (let i = 0; i < hyperIds.length; i++) {
                    let id = hyperIds[i];
                    // console.log(hyperIds, id ,isMultiple);return
                    let data = await VZ.Call('', `/os-hypervisors`, "GET", true, hyperIps[i]);
                    finalHosts.push(data);
                }

                return resolve(Promise.all(finalHosts));
            } else {
                let data = await VZ.Call('', `/os-hypervisors`, "GET", true, hyperIps);
                return resolve(data);
            }

        } catch (err) {
            console.log(err)
            reject('error in fetching host details');
        }
    });
}

function getAllDomains(params) {
    return new Promise(async function (resolve, reject) {
        try {
            let domains = await VZ.Call('', `/v3/domains`, "GET", false, params?.cluster_url);
            return resolve(domains?.data?.domains || [])
            // let data = await VZ.Call('', `/v3/domains`, "GET");
            // console.log(data?.data?.domains);
            // return resolve(data?.data?.domains || []);
        } catch (err) {
            reject('error in fetching host details');
        }
    });
}

async function objectToQueryString(obj) {
    var str = [];
    for (var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
}

function getAllvms(params) {
    return new Promise(async function (resolve, reject) {
        try {
            let id = { host: params?.host };
            if (params?.userId) {
                id = { user_id: params?.userId };
            }
            let filters = await objectToQueryString(params?.filter)
            let data = await VZ.Call('', `/servers/detail?${filters}`, "GET", true,params?.cluster_url);
            // let data = await VZ.Call('', `/servers/detail`, "GET", true,params?.cluster_url);
            // let data = await VZ.Call('', `/servers?all_tenants`, "GET",true);
            // let data = await VZ.Call('', `/os-hosts`, "GET",true);
            // console.log(data?.data?.servers);
            return resolve(data?.data?.servers || []);
        } catch (err) {
            reject('error in fetching host details');
        }
    });
}

function extendTrialTime(data) {
    return new Promise(async function (resolve, reject) {
        try {
            await User.updateUserFields(data);
            return resolve(true);
        } catch (err) {
            reject(err)
        }
    });
}

function blockVM(params) {
    return new Promise(async (resolve, reject) => {
        try {
            let vzTableData = await User.getVirtuozzoByUserId(params?.userId);
            let json;
            if (params?.type == 'lock') {
                json = { lock: { "locked_reason": "Trial has been expired" } }
            }
            if (params?.type == 'unlock') {
                json = { unlock: null }
            }
            // console.log(json);return;
            let VZServerData = await VZ.Call(json, `/servers/${vzTableData[0]?.server_id}/action`, "POST", true);
            // console.log('---',VZServerData);
            if (VZServerData?.data?.server) {
                resolve(VZServerData?.data?.server);
            } else {
                resolve(VZServerData);
            }
        } catch (err) {
            reject('error in fetching domain details', err);
        }
    });
}

function getAllHosts() {
    return new Promise(async function (resolve, reject) {
        try {
            let clusterTableData = await getClustersTableData();
            let clustersData =[];
            /* clusterTableData.forEach(async (element) => {
                // hyperIps.push(element?.cluster_url);
                let cluster = await getClusterHostListDetailsByUrl(element?.cluster_url);
                clustersData.push(cluster);
            }); */
            await Promise.all(clusterTableData.map(async (element) => {
                let cluster = await VZ.Call('', `/os-hypervisors/detail`, "GET", true, element?.cluster_url);
                // let cluster = getClusterHostListDetailsByUrl(element?.cluster_url);
                delete element?.cluster_password;
                clustersData.push({clusterInfo: element,hostsList:cluster?.data?.hypervisors || []});
            }));
            // console.log("clustersData",clustersData);
            resolve(clustersData || null)
        } catch (err) {
            console.log(err);
            let msg = 'error in fetching clusters';
            // Logger.logged().error(`request-> url = /servers, method = GET ,Data = '' , response-> ${msg}`);
            reject(msg);
        }
    });
}

async function getClusterHostListDetailsByUrl(cluster_url) {
    return new Promise(async function (resolve, reject) {
        try {
            let data = await VZ.Call('', `/os-hypervisors/detail`, "GET", true, cluster_url);
            return resolve(data?.data?.hypervisors || []);

        } catch (err) {
            console.log(err)
            reject('error in fetching host details');
        }
    });
}

async function getClustersTableData() {
    return new Promise(async (resolve, reject) => {
        try {
            DB.query(`select id, cluster_name, cluster_ip, cluster_url, cluster_admin_url, cluster_username, cluster_password, cluster_image_ref, cluster_flavor_ref, cluster_uuid, status from clusters where status = '1'`, function (error, results) {
                if (error) throw error;
                resolve(results.length ? results : null);
            })
        }
        catch (err) {
            reject(err)
        }
    });
}

async function getCluster(cond) {
    return new Promise(async (resolve, reject) => {
        try {
            DB.query(`select id, cluster_name, cluster_ip, cluster_url, cluster_admin_url, cluster_username, cluster_password, cluster_image_ref, cluster_flavor_ref, cluster_uuid, status from clusters ${cond}`, function (error, results) {
                if (error) throw error;
                resolve(results[0] || null);
            })
        }
        catch (err) {
            reject(err)
        }
    });
}

async function saveCluster(params) {
    return new Promise(async (resolve, reject) => {
        try {
            let clusterUrl = `https://${params?.cluster_ip}:5000`;
            let user = {
                user: {
                    tokenType: "user",
                    domainId: "default",
                    projectName: "admin",
                    userName: params?.cluster_username,
                    password: params?.cluster_password
                }
            };
            let checkCluster = await VZ.ClusterVerification(user,clusterUrl);
            // console.log();
            if(checkCluster){
                let checkDuplicateUrl = await getCluster(` where cluster_url='${clusterUrl}'`);
                let qry = `insert into clusters (cluster_name, cluster_ip, cluster_url, cluster_admin_url, cluster_username, cluster_password, cluster_image_ref, cluster_flavor_ref, cluster_uuid) values ('${params?.cluster_name}', '${params?.cluster_ip}' , '${clusterUrl}' , "${params?.cluster_admin_url}", '${params?.cluster_username}' , '${params?.cluster_password}', '${params?.cluster_image_ref}', '${params?.cluster_flavor_ref}', '${params?.cluster_uuid}')`
                if (checkDuplicateUrl) {
                    qry = `update clusters set cluster_name='${params?.cluster_name}', cluster_ip='${params?.cluster_ip}', cluster_url='${clusterUrl}', cluster_admin_url = "${params?.cluster_admin_url}", cluster_username='${params?.cluster_username}', cluster_password='${params?.cluster_password}' , cluster_flavor_ref='${params?.cluster_flavor_ref}', cluster_image_ref='${params?.cluster_image_ref}', cluster_uuid='${params?.cluster_uuid}' where cluster_url = '${clusterUrl}'`
                }
                DB.query(qry, async function (error, results) {
                    if (error) throw error;
                    
                    let getClusterInfo = await getCluster(` where cluster_url='${clusterUrl}'`);
                    resolve(getClusterInfo || null);
                })
            }else{
                reject('The Cluster is not accessible')
            }
        } catch (err) {
            reject(err);
        }
    });
}

async function getHostTableData() {
    return new Promise(async (resolve, reject) => {
        try {
            DB.query(`select id, cluster_name, cluster_ip, cluster_url, cluster_username, cluster_password, cluster_image_ref, cluster_flavor_ref, cluster_uuid from clusters`, function (error, results) {
                if (error) throw error;
                resolve(results.length ? results : null);
            })
        }
        catch (err) {
            reject(err)
        }
    });
}

async function getClusterById(id) {
    return new Promise(async (resolve, reject) => {
        try {
            DB.query(`select id, cluster_name, cluster_ip, cluster_url, cluster_admin_url, cluster_username, cluster_password, cluster_image_ref, cluster_flavor_ref, cluster_uuid, status from clusters where id= ${id} `, function (error, results) {
                if (error) throw error;
                resolve(results.length ? results[0] : null);
            })
        }
        catch (err) {
            reject(err)
        }
    });
}

async function saveHost(params) {
    return new Promise(async (resolve, reject) => {
        try {
            // let duplicate = await getHostById(params?.host_id);
            let qry = `insert into hosts (host_id, host_url, host_name, host_ip, host_port) values ('${params?.host_id}', '${params?.host_url}' , '${params?.host_name}' , '${params?.host_ip}' , ${params?.host_port})`
            if (params?.id) {
                qry = `update hosts set host_id='${params?.host_id}', host_url='${params?.host_url}', host_name='${params?.host_name}', host_ip='${params?.host_ip}', host_port=${params?.host_port} where id =${params?.id}`
            }
            DB.query(qry, function (error, results) {
                if (error) throw error;

                resolve(results || null);
            })
        } catch (err) {
            reject(err);
        }
    });
}

 function getEligibleHostBasedPlan(hostDetails, planType) {
    const cpus_avl = hostDetails?.vcpus - hostDetails?.vcpus_used;
    const ram_avl = hostDetails?.free_ram_mb;
    const disk_avl = hostDetails?.free_disk_gb;
    if (planType === 'FIXED') {
        console.log("cpus_avl" ,cpus_avl,"ram_avl" ,ram_avl , "disk_avl" ,disk_avl)
        let cpuEligible = cpus_avl >= 2;
        let checkRam = ram_avl >= 4096;
        let checkDisk = disk_avl >= 64;
        return cpuEligible && checkRam && checkDisk
    } else {

    }

    return false;
}

async function getHostAutomatic(planType) {
    
    
    return new Promise(async (resolve, reject) => {
        try {

            DB.query(`select id, cluster_name, cluster_ip, cluster_url, cluster_admin_url, cluster_username, cluster_password, cluster_image_ref, cluster_flavor_ref, cluster_uuid, status from clusters`, async function (error, results) {
                if (error) throw error;

                let selectedCluster = null;

                for (let i = 0; i < results.length; i++) {

                    const cluster = results[i];
                    let hostLists = await getClusterHostListDetailsByUrl(cluster?.cluster_url);

                    let eligibleHostList = hostLists.filter((host) => getEligibleHostBasedPlan(host, planType));
                    // console.log("eligibleHostList count====" ,eligibleHostList.length)
                    if (eligibleHostList.length > 0) {
                        selectedCluster = cluster;
                        break;
                    }

                }
                // console.log('selectedCluster', selectedCluster);
                return resolve(selectedCluster);
            })
        }catch(err){
            reject(err);
        }
    });
}

function getEnvPlanDetails(condition) {
    return new Promise(async function (resolve, reject) {
        try {
            let qry = `select * from env_plan_config ${condition}`;
            DB.query(qry, function (error, results) {
                if (error) throw error;

                return resolve(results || null);
            })
        } catch (err) {
            reject('error in fetching env configurations', err);
        }
    });
}

function saveEnvPlan(data) {
    return new Promise(async function (resolve, reject) {
        try {
            let checkEnvPlan = await getEnvPlanDetails(`where env_plan = '${data?.env_plan}'`);
            
            if (checkEnvPlan && checkEnvPlan.length) {
                // let price_per_size = parseFloat(data.price / data.size);
                let env_configuration = JSON.stringify(data?.env_configuration);
                let updQry = `update env_plan_config set env_configuration = '${env_configuration}', env_plan_status='${data.status}' where id= ${checkEnvPlan[0]?.id}`;
                
                await DB.query(updQry, async function (error, results) {
                    if (error) throw error;

                    let checkEnvPlan = await getEnvPlanDetails(`where env_plan = '${data?.env_plan}'`);
                    resolve(checkEnvPlan[0] || null);
                })
            } else {
                
                // let price_per_size = parseFloat(data.price / data.size);
                let env_configuration = JSON.stringify(data?.env_configuration);
                
                let insQry = `insert into env_plan_config (env_plan, env_configuration, env_plan_status) VALUES('${data.env_plan}','${env_configuration}','${data.status}')`;
                await DB.query(insQry, async function (error, results) {
                    if (error) throw error;

                    let checkEnvPlan = await getEnvPlanDetails(`where env_plan = '${data?.env_plan}'`);
                    resolve(checkEnvPlan[0] || null);
                })
            }
        } catch (err) {
            reject('Error in adding env configurations', err);
        }
    });
}