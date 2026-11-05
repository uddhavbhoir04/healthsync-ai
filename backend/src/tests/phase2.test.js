const assert = require("assert");
const jwt = require("jsonwebtoken");

// Import schemas and middlewares
const {
    updateProfileSchema,
    addressSchema,
    updateAddressSchema
} = require("../modules/users/users.validation");
const {
    listUsersQuerySchema,
    updateUserStatusSchema,
    updateUserRoleSchema
} = require("../modules/admin/admin.validation");
const allowRoles = require("../middleware/role.middleware");

console.log("=== Running HealthSync AI Phase 2 Test Suite ===\n");

let passed = 0;
let failed = 0;

function it(description, fn) {
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

// 1. Profile Validation Tests
console.log("1. Patient Profile Validation:");

it("1.1 should accept valid profile with past date of birth", () => {
    const validData = {
        name: "Alex Morgan",
        phone: "+1-555-234-5678",
        dateOfBirth: "1990-05-15",
        gender: "FEMALE",
        profileImageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2"
    };
    const result = updateProfileSchema.safeParse(validData);
    assert.strictEqual(result.success, true);
});

it("1.2 should reject future date of birth", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const dateStr = futureDate.toISOString().split("T")[0];

    const result = updateProfileSchema.safeParse({
        dateOfBirth: dateStr
    });
    assert.strictEqual(result.success, false);
    const issues = result.error.issues || result.error.errors;
    assert.match(issues[0].message, /past/i);
});

it("1.3 should reject today's date as date of birth", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const result = updateProfileSchema.safeParse({
        dateOfBirth: todayStr
    });
    assert.strictEqual(result.success, false);
});

it("1.4 should reject invalid phone formats", () => {
    const result = updateProfileSchema.safeParse({
        phone: "123" // Too short
    });
    assert.strictEqual(result.success, false);
});

it("1.5 should accept valid gender enum values", () => {
    for (const g of ["MALE", "FEMALE", "OTHER"]) {
        const res = updateProfileSchema.safeParse({ gender: g });
        assert.strictEqual(res.success, true);
    }
});

// 2. Address Validation Tests
console.log("\n2. Address Management Validation:");

it("2.1 should validate correct address payload", () => {
    const validAddress = {
        fullName: "Alex Morgan",
        phone: "+1-555-019-2831",
        addressType: "HOME",
        addressLine1: "742 Evergreen Terrace",
        addressLine2: "Apt 4B",
        city: "Springfield",
        state: "Oregon",
        pincode: "97477",
        landmark: "Near Central Memorial",
        isDefault: true
    };
    const res = addressSchema.safeParse(validAddress);
    assert.strictEqual(res.success, true);
});

it("2.2 should reject address missing required fields (pincode, city, line1)", () => {
    const incomplete = {
        fullName: "Alex",
        phone: "+1-555-019-2831"
    };
    const res = addressSchema.safeParse(incomplete);
    assert.strictEqual(res.success, false);
    const issues = res.error.issues || res.error.errors;
    assert(issues.length >= 3);
});

it("2.3 should enforce addressType enum (HOME, WORK, OTHER)", () => {
    const invalidType = {
        fullName: "Alex",
        phone: "+1-555-019-2831",
        addressType: "VACATION_HOME", // Invalid
        addressLine1: "123 Beach Road",
        city: "Miami",
        state: "Florida",
        pincode: "33101"
    };
    const res = addressSchema.safeParse(invalidType);
    assert.strictEqual(res.success, false);
});

// 3. RBAC & allowRoles Middleware Tests
console.log("\n3. Role-Based Access Control (RBAC):");

it("3.1 allowRoles should return 401 when req.user is absent", () => {
    const middleware = allowRoles("ADMIN");
    let statusReturned = null;
    let jsonReturned = null;

    const req = {};
    const res = {
        status: (code) => {
            statusReturned = code;
            return {
                json: (payload) => {
                    jsonReturned = payload;
                }
            };
        }
    };
    const next = () => {
        throw new Error("next() should not be called");
    };

    middleware(req, res, next);
    assert.strictEqual(statusReturned, 401);
    assert.strictEqual(jsonReturned.success, false);
});

it("3.2 allowRoles('ADMIN') should return 403 for PATIENT role", () => {
    const middleware = allowRoles("ADMIN");
    let statusReturned = null;
    let jsonReturned = null;

    const req = { user: { id: 1, role: "PATIENT" } };
    const res = {
        status: (code) => {
            statusReturned = code;
            return {
                json: (payload) => {
                    jsonReturned = payload;
                }
            };
        }
    };
    const next = () => {
        throw new Error("next() should not be called");
    };

    middleware(req, res, next);
    assert.strictEqual(statusReturned, 403);
    assert.strictEqual(jsonReturned.success, false);
    assert.match(jsonReturned.message, /forbidden|permission/i);
});

it("3.3 allowRoles('ADMIN') should call next() for ADMIN role", () => {
    const middleware = allowRoles("ADMIN");
    let nextCalled = false;

    const req = { user: { id: 1, role: "ADMIN" } };
    const res = {};
    const next = () => {
        nextCalled = true;
    };

    middleware(req, res, next);
    assert.strictEqual(nextCalled, true);
});

it("3.4 allowRoles('PATIENT', 'DOCTOR') should grant access to either role", () => {
    const middleware = allowRoles("PATIENT", "DOCTOR");
    let patientAllowed = false;
    let doctorAllowed = false;

    middleware({ user: { role: "PATIENT" } }, {}, () => {
        patientAllowed = true;
    });
    middleware({ user: { role: "DOCTOR" } }, {}, () => {
        doctorAllowed = true;
    });

    assert.strictEqual(patientAllowed, true);
    assert.strictEqual(doctorAllowed, true);
});

// 4. Admin Management Validation Tests
console.log("\n4. Admin Governance Validation:");

it("4.1 should validate list users pagination query params", () => {
    const query = { page: "2", limit: "25", role: "PATIENT", status: "true" };
    const res = listUsersQuerySchema.safeParse(query);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.page, 2);
    assert.strictEqual(res.data.limit, 25);
    assert.strictEqual(res.data.status, true);
});

it("4.2 should validate user role updates against allowed roles", () => {
    assert.strictEqual(updateUserRoleSchema.safeParse({ role: "DOCTOR" }).success, true);
    assert.strictEqual(updateUserRoleSchema.safeParse({ role: "ADMIN" }).success, true);
    assert.strictEqual(updateUserRoleSchema.safeParse({ role: "SUPER_ADMIN" }).success, false);
});

it("4.3 should validate user status update boolean payload", () => {
    assert.strictEqual(updateUserStatusSchema.safeParse({ status: false }).success, true);
    assert.strictEqual(updateUserStatusSchema.safeParse({ status: true }).success, true);
    assert.strictEqual(updateUserStatusSchema.safeParse({ status: "invalid" }).success, false);
});

// 5. Admin Self-Protection Business Rules
console.log("\n5. Admin Self-Protection Business Logic:");

it("5.1 should prevent admin from deactivating their own account", async () => {
    const adminService = require("../modules/admin/admin.service");
    try {
        await adminService.updateUserStatus(1, 1, false);
        assert.fail("Should have thrown error");
    } catch (err) {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /cannot deactivate your own admin account/i);
    }
});

it("5.2 should prevent admin from demoting their own admin role", async () => {
    const adminService = require("../modules/admin/admin.service");
    try {
        await adminService.updateUserRole(1, 1, "PATIENT");
        assert.fail("Should have thrown error");
    } catch (err) {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /cannot remove your own admin privileges/i);
    }
});

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
