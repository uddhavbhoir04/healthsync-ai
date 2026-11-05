const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./users.controller");
const {
    updateProfileSchema,
    addressSchema,
    updateAddressSchema
} = require("./users.validation");

const router = express.Router();

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.flatten()
        });
    }

    req.body = result.data;
    next();
};

// All user routes require authentication
router.use(authMiddleware);

// Profile Endpoints
router.get("/profile", controller.getProfile);
router.put("/profile", validate(updateProfileSchema), controller.updateProfile);

// Address Endpoints
router.get("/addresses", controller.getAddresses);
router.post("/addresses", validate(addressSchema), controller.createAddress);
router.put("/addresses/:id", validate(updateAddressSchema), controller.updateAddress);
router.patch("/addresses/:id/default", controller.setDefaultAddress);
router.delete("/addresses/:id", controller.deleteAddress);

module.exports = router;

