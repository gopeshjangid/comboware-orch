const VZ = require("./VZController");
const Virtuozzo = require("../models/Virtuozzo");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const CONFIG = require("../config");
const Logger = require("../logger");
const { config } = require("dotenv");

class WorkspaceController {
  static createDomain = async (req, res) => {
    try {
      let userData = await User.getUserById(req?.body?.userId);
      let clusterData =  await Workspace.getHostAutomatic(req?.body?.plan_type);
      console.log('cluster_url',clusterData);
      let cluster_url = clusterData?.cluster_url || '' ;
      //host_ip ya nodeIP

      if (userData[0] && cluster_url) {
        // let vzTableData = await User.getVirtuozzoByUserId(req?.body?.userId);
        let result = await VZ.Call({ domain: req?.body?.domain }, "/v3/domains", "POST",false ,cluster_url);
        if (result?.data?.domain?.id) {
          req.body.project.domain_id = result?.data?.domain?.id;
          let resultProject = await VZ.Call({ project: req?.body?.project }, "/v3/projects", "POST",false,cluster_url);
          // save domain id in the database
          if (resultProject?.data?.project?.id) {
            await Virtuozzo.createVirtuozzoDetails({
              user_id: req?.body?.userId,
              domain_id: result?.data?.domain?.id,
              project_id: resultProject?.data?.project?.id,
              domain_name: result?.data?.domain?.name,
              project_name: resultProject?.data?.project?.name,
              cluster_url: cluster_url,
            });
            let qData = { "quota_set": { "ram": CONFIG.QUOTA_RAM, "cores": CONFIG.QUOTA_CORES } };
            let quotaData = await VZ.Call(qData, `/os-quota-sets/${resultProject?.data?.project?.id}`, 'PUT', true,cluster_url);
            let data = {};
            data.domain = result?.data;
            data.project = resultProject?.data;
            await User.updateUserPlan(req?.body);
            await User.createUserinVZ(userData[0],cluster_url);
            return res.status(200).json({ data: { domain: result?.data?.domain, ...resultProject?.data }, status: true, message: "" });
          } else {
            let msg = (result?.data == '409') ? 'Duplicate domain name not allowed' : 'Unable to create Domain';
            Logger.logged().error(`request-> url = /v3/domains, method = POST ,Data = `,JSON.stringify(req?.body?.domain),`response-> ${msg} with error code ${result?.data}`);
            // Logger.logged().error(msg, result?.data);
            return res.status(500).json({ data: null, status: false, message: msg });
          }
        }else{
          let msg = (result?.data == '409') ? 'Duplicate domain name not allowed' : 'Unable to create Domain';
          Logger.logged().error(`request-> url = /v3/domains, method = POST ,Data = `,JSON.stringify(req?.body?.domain),`response-> ${msg} with error code ${result?.data}`);
          // Logger.logged().error(msg, result?.data);
          return res.status(500).json({ data: null, status: false, message: msg });
        }
      } else {
        return res.status(500).json({ data: null, status: false, message: "Unable to create domain" });
      }
    } catch (error) {
      console.log('error in catch', error);
      return res
        .status(500)
        .json({
          data: null,
          status: false,
          message: error || error?.data || "Error in creating domain.",
        });
    }
  };

  static getDomainDetails = async (req, res) => {
    return res.status(200).json({ data: "dsadasd" });
  };

  static createWorkspace = async (req, res) => {
    try {
      let data = await Workspace.createWorkspace(req.body);
      if (data) {
        return res.status(200).json({ data: data, status: true, message: "Workspace created successfully" });
      } else {
        return res.status(500).send({ "data": null, "status": false, "message": "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in creating domain." });
    }
  };

  static getWorkspaceDetails = async (req, res) => {
    try {
      if (!req.query.workspaceId) {
        return res.status(500).json({ data: null, status: false, message: "Workspace Id missing." });
      }
      let data = await Workspace.getWorkspaceDetails(`where id = ${req?.query?.workspaceId} `);
      if (data[0]) {
        return res.status(200).json({ data: data[0] || null, status: true, message: "Fetched Workspace Details successfully" });
      } else {
        return res.status(500).json({ data: null, status: false, message: "Invalid Workspace" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching workspace details." });
    }
  };

  static getAllWorkspaceRequest = async (req, res) => {
    try {
      if (!req.query.status) {
        return res.status(500).json({ data: null, status: false, message: "Workspace Id missing." });
      }
      let data = await Workspace.getWorkspaceDetails(`where request_status = '${req?.query?.status}' `);
      return res.status(200).json({ data: data || null, status: true, message: "Fetched All Workspace Details successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching all workspace details." });
    }
  };

  static updateRequest = async (req, res) => {
    try {
      let data = await Workspace.updateRequest(req.body);
      if (data) {
        if (data == 'Invalid Workspace') {
          return res.status(500).json({ data: null, status: false, message: data });
        } else if (data == 'server creation failed') {
          return res.status(500).json({ data: null, status: false, message: data });
        } else {
          return res.status(200).json({ data: data || null, status: true, message: "Update Workspace Request successfully" });
        }
      } else {
        return res.status(500).json({ data: null, status: false, message: "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching all workspace details." });
    }
  };

  static getServerDetails = async (req, res) => {
    try {
      let data = await Workspace.getServerDetails(req?.query?.userId);
      if (data) {
        return res.status(200).json({ data: data || null, status: true, message: "Fetched server Details successfully" });
      } else {
        return res.status(500).json({ data: null, status: false, message: "Invalid User" });
      }
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching server details." });
    }
  };

  static addResourceQuotation = async (req, res) => {
    try {
      let data = await Workspace.addResourceQuotation(req.body);
      return res.status(200).json({ data: data, status: true, message: "Resource Quotation created successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in adding Resource Quotation." });
    }
  };

  static getAllResourceQuotations = async (req, res) => {
    try {
      let data = await Workspace.getResQuoteDetails((req?.query?.resource_type)?`where resource_type = "${req?.query?.resource_type}"`:"");
      return res.status(200).json({ data: data, status: true, message: "Resource Quotation created successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in adding Resource Quotation." });
    }
  };

  static getAllHosts = async (req, res) => {
    try {
      let data = await Workspace.getAllHosts();
      return res.status(200).json({ data: data, status: true, message: "Hosts fetched successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching hosts." });
    }
  };

  static getAllDomains = async (req, res) => {
    try {
      let data = await Workspace.getAllDomains(req?.query);
      return res.status(200).json({ data: data, status: true, message: "Domains fetched successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching domains." });
    }
  };

  static getAllvms = async (req, res) => {
    try {
      let data = await Workspace.getAllvms(req?.body);
      return res.status(200).json({ data: data, status: true, message: "VMs fetched successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching vms." });
    }
  };

  static extendTrialTime = async (req, res) => {
    try {
      if(req?.body?.user_type && req?.body?.user_type === 'ADMIN'){
        let data = await Workspace.extendTrialTime(req?.body);
        return res.status(200).json({ data: data || null, status: true, message: "Extend Trial Time Successfully" });
      }else{
        return res.status(500).json({ data: null, status: false, message: "Only Admin can extend the trial period." });
      }
    } catch (error) {
      // console.log('error', error);return;
      return res.status(500).json({ data: null, status: false, message: error || "Error in extending trial time." });
    }
  };

  static blockVM = async (req, res) => {
    try {
      let data = await Workspace.blockVM(req?.body);
      return res.status(200).json({ data: data || null, status: true, message: "VM blocked" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching all workspace details." });
    }
  };

  static saveHost = async (req, res) => {
    try {
      let data = await Workspace.saveHost(req?.body);
      return res.status(200).json({ data: data || null, status: true, message: "Host created successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || "Error in creating host." });
    }
  };

  static saveCluster = async (req, res) => {
    try {
      let data = await Workspace.saveCluster(req?.body);
      return res.status(200).json({ data: data || null, status: true, message: "Cluster created successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || "Error in creating cluster." });
    }
  };

  static getAllClusters = async (req, res) => {
    try {
      let data = await Workspace.getClustersTableData();
      return res.status(200).json({ data: data, status: true, message: "Clusters fetched successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching clusters." });
    }
  };

  static getAllClusterById = async (req, res) => {
    try {
      let data = await Workspace.getClusterById(req?.query?.id);
      return res.status(200).json({ data: data, status: true, message: "Clusters fetched successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching clusters." });
    }
  };  

  static saveEnvPlan = async (req, res) => {
    try {
      let data = await Workspace.saveEnvPlan(req?.body);
      return res.status(200).json({ data: data || null, status: true, message: "Env Plan created successfully" });
    } catch (error) {
      return res.status(500).json({ data: null, status: false, message: error || "Error in creating env plans." });
    }
  };
}

module.exports = WorkspaceController;
