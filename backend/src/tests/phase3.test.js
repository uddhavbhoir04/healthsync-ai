const assert = require("assert");

const {
    createDoctorSchema,
    availabilitySchema,
    queryDoctorSchema
} = require("../modules/doctors/doctors.validation");

const {
    createLabTestSchema,
    queryLabTestSchema
} = require("../modules/lab-tests/lab-tests.validation");

const {
    createPackageSchema,
    queryPackageSchema
} = require("../modules/packages/packages.validation");

const { getCache, setCache, delCache, invalidatePattern } = require("../utils/cache");

console.log("=== Running HealthSync AI Phase 3 Test Suite ===\n");

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

async function itAsync(description, fn) {
    try {
        await fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

async function runTests() {
    // 1. Doctor Validation
    console.log("1. Doctor Validation:");

    it("1.1 should validate correct doctor payload", () => {
        const valid = {
            doctorName: "Dr. Sarah Jenkins",
            specialization: "Cardiology",
            qualification: "MD, FACC",
            experienceYears: 14,
            consultationFee: 120.00,
            city: "San Francisco",
            pincode: "94102"
        };
        const res = createDoctorSchema.safeParse(valid);
        assert.strictEqual(res.success, true);
    });

    it("1.2 should reject doctor with negative consultation fee", () => {
        const invalid = {
            doctorName: "Dr. Sarah Jenkins",
            specialization: "Cardiology",
            qualification: "MD, FACC",
            consultationFee: -20.00,
            city: "San Francisco",
            pincode: "94102"
        };
        const res = createDoctorSchema.safeParse(invalid);
        assert.strictEqual(res.success, false);
    });

    // 2. Doctor Availability Validation
    console.log("\n2. Doctor Availability Validation:");

    it("2.1 should validate valid availability window", () => {
        const valid = {
            dayOfWeek: "MONDAY",
            startTime: "09:00",
            endTime: "13:00",
            slotDuration: 30
        };
        const res = availabilitySchema.safeParse(valid);
        assert.strictEqual(res.success, true);
    });

    it("2.2 should reject availability where start_time >= end_time", () => {
        const invalid = {
            dayOfWeek: "MONDAY",
            startTime: "14:00",
            endTime: "10:00",
            slotDuration: 30
        };
        const res = availabilitySchema.safeParse(invalid);
        assert.strictEqual(res.success, false);
        const issues = res.error.issues || res.error.errors;
        assert.match(issues[0].message, /later than start time/i);
    });

    it("2.3 should reject availability with invalid slot duration", () => {
        const invalid = {
            dayOfWeek: "MONDAY",
            startTime: "09:00",
            endTime: "13:00",
            slotDuration: 5 // Less than 10 mins
        };
        const res = availabilitySchema.safeParse(invalid);
        assert.strictEqual(res.success, false);
    });

    // 3. Lab Test Validation
    console.log("\n3. Lab Test Validation:");

    it("3.1 should validate correct lab test payload", () => {
        const valid = {
            testName: "Complete Blood Count",
            testCode: "CBC-101",
            category: "Hematology",
            sampleType: "Blood",
            fastingRequired: false,
            price: 25.00
        };
        const res = createLabTestSchema.safeParse(valid);
        assert.strictEqual(res.success, true);
    });

    it("3.2 should reject lab test with empty test code", () => {
        const invalid = {
            testName: "Complete Blood Count",
            testCode: "",
            category: "Hematology",
            price: 25.00
        };
        const res = createLabTestSchema.safeParse(invalid);
        assert.strictEqual(res.success, false);
    });

    // 4. Diagnostic Package Pricing Rules
    console.log("\n4. Diagnostic Package Pricing Validation:");

    it("4.1 should validate package when offer_price <= original_price", () => {
        const valid = {
            packageName: "Comprehensive Full Body Vitality Screen",
            packageCode: "PKG-FULLBODY",
            originalPrice: 200.00,
            offerPrice: 140.00,
            testIds: [1, 2, 3]
        };
        const res = createPackageSchema.safeParse(valid);
        assert.strictEqual(res.success, true);
    });

    it("4.2 should REJECT package when offer_price > original_price", () => {
        const invalid = {
            packageName: "Overpriced Package",
            packageCode: "PKG-OVERPRICED",
            originalPrice: 100.00,
            offerPrice: 150.00, // Invalid!
            testIds: [1]
        };
        const res = createPackageSchema.safeParse(invalid);
        assert.strictEqual(res.success, false);
        const issues = res.error.issues || res.error.errors;
        assert.match(issues[0].message, /cannot exceed original price/i);
    });

    // 5. Redis Caching & Invalidation Logic
    console.log("\n5. Redis Resilient Cache Layer:");

    await itAsync("5.1 should set and retrieve cached values with TTL", async () => {
        await setCache("test:key1", { data: "sample_payload" }, 10);
        const retrieved = await getCache("test:key1");
        assert.deepStrictEqual(retrieved, { data: "sample_payload" });
    });

    await itAsync("5.2 should invalidate cached keys by prefix pattern", async () => {
        await setCache("doctors:cardio", { name: "Dr. Jenkins" }, 60);
        await setCache("doctors:neuro", { name: "Dr. Vance" }, 60);
        await setCache("tests:cbc", { name: "CBC" }, 60);

        await invalidatePattern("doctors:");

        const cardio = await getCache("doctors:cardio");
        const neuro = await getCache("doctors:neuro");
        const cbc = await getCache("tests:cbc");

        assert.strictEqual(cardio, null);
        assert.strictEqual(neuro, null);
        assert.deepStrictEqual(cbc, { name: "CBC" });
    });

    console.log(`\n========================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();

