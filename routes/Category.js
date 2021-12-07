const router = require('express').Router();

const CategoryController = require("../controllers/CategoryController");
const auth = require("../middleware/auth");

router.post("/saveCategory", CategoryController.saveCategory);
router.post("/saveSubcategory", CategoryController.saveSubcategory);
router.put("/enableDisableCatSubcat", CategoryController.enableDisableCatSubcat);
router.get("/getAllCategories", CategoryController.getAllCategories);
module.exports = router;