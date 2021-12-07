const router = require("express").Router();

const PaymentController = require("../controllers/PaymentController");
const auth = require("../middleware/auth");

router.post("/savePayment", auth, PaymentController.savePayment);
router.get("/getPaymentDetails", auth, PaymentController.getPaymentDetails);
router.get("/getAllPayments", auth, PaymentController.getAllPayments);
router.post("/getBillingAmount",auth, PaymentController.getBillingAmount);
router.get("/getBilling", auth, PaymentController.getBilling);
module.exports = router;
