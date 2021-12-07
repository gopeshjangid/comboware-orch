const {DB} = require("../database/connection");
const VZ = require("../controllers/VZController");

const createVirtuozzoDetails = async (data) => {

	return DB.query(`insert into virtuozzo (user_id, domain_id, project_id, cluster_url) values (${data?.user_id} , '${data?.domain_id}', '${data?.project_id}', '${data?.cluster_url}')`, function (error, results) {
		if (error) throw error;
		return JSON.parse(JSON.stringify(results));
	})
}

const getDomainDetails = async (userId) => {
	let dataRs = DB.query(`select domain_id from  virtuozzo  where user_id = ${data?.user_id} `, function (error, results) {
		if (error) throw error;
		return JSON.parse(JSON.stringify(results));
	})

	let domainId = dataRs?.domain_id;
	let domainDetails = await VZ.Call('', "/v3/domains/" + domainId, "GET", false, dataRs?.cluster_url);
	return domainDetails?.domain || null;
}

const getDomainById = async (id,cluster_url) => {
	return new Promise(async (resolve, reject) => {
		try {
			let domainData = await VZ.Call('', `/v3/domains/${id}`, "GET",false,cluster_url);
			if (domainData.data.domain) {
				resolve(domainData.data.domain);
			} else {
				resolve(domainData);
			}
		} catch (err) {
			reject('error in fetching domain details', err);
		}
	});
}
const getProjectById = async (id,cluster_url) => {
	return new Promise(async (resolve, reject) => {
		try {
			let projectData = await VZ.Call('', `/v3/projects/${id}`, "GET",false,cluster_url);
			if (projectData.data.project) {
				resolve(projectData.data.project);
			} else {
				resolve(projectData);
			}
		} catch (err) {
			reject('error in fetching domain details', err);
		}
	});
}
const getRoles = async (cluster_url) => {
	return new Promise(async (resolve, reject) => {
		try {
			let roleData = await VZ.Call('', `/v3/roles`, "GET",false,cluster_url);
			if (roleData.data.roles) {
				resolve(roleData.data.roles)
			} else {
				resolve(roleData)
			}
		} catch (err) {
			reject('error in fetching roles', err);
		}
	});
}





module.exports = { createVirtuozzoDetails, getDomainDetails, getDomainById, getProjectById, getRoles }