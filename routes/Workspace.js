const router = require('express').Router();

const WorkspaceController = require("../controllers/WorkspaceController");
const auth = require("../middleware/auth");

router.post("/createWorkspace", auth, WorkspaceController.createWorkspace);
router.get("/getDomainDetails", auth, WorkspaceController.getDomainDetails);
router.post("/createDomain", auth, WorkspaceController.createDomain);
router.get("/getWorkspaceDetails", auth, WorkspaceController.getWorkspaceDetails);
router.get("/getAllWorkspaceRequest", auth, WorkspaceController.getAllWorkspaceRequest);
router.put("/updateRequest", auth, WorkspaceController.updateRequest);
router.put("/extendTrialTime", auth, WorkspaceController.extendTrialTime);
router.get("/getServerDetails", auth, WorkspaceController.getServerDetails);
router.post("/addResourceQuotation", auth, WorkspaceController.addResourceQuotation);
router.get("/getAllResourceQuotations", auth, WorkspaceController.getAllResourceQuotations);
router.get("/getAllHosts", auth, WorkspaceController.getAllHosts);
router.get("/getAllDomains", auth, WorkspaceController.getAllDomains);
router.post("/getAllvms", auth, WorkspaceController.getAllvms);
router.post("/blockVM", auth, WorkspaceController.blockVM);
router.post("/saveHost", auth, WorkspaceController.saveHost);
router.post("/saveCluster", auth, WorkspaceController.saveCluster);
router.get("/getAllClusters", auth, WorkspaceController.getAllClusters);
router.get("/getAllClusterById", auth, WorkspaceController.getAllClusterById);
router.post("/saveEnvPlan", auth, WorkspaceController.saveEnvPlan);

module.exports = router;