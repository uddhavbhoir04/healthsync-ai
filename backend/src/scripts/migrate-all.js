/**
 * HealthSync AI - Master Database Migration & Seeding Runner
 * Executes all Phase 2-7 database migrations idempotently in sequence.
 *
 * Usage: npm run db:migrate
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config(); // fallback

const { execSync } = require("child_process");

const migrationScripts = [
    "migrate-phase2.js",
    "migrate-phase3.js",
    "migrate-phase4.js",
    "migrate-phase5.js",
    "migrate-phase6.js",
    "migrate-phase7.js"
];

async function runAllMigrations() {
    console.log("==================================================================");
    console.log("🚀 HealthSync AI — Running All Database Migrations (Phases 2–7)");
    console.log("==================================================================\n");

    const scriptsDir = __dirname;

    for (const script of migrationScripts) {
        const fullPath = path.join(scriptsDir, script);
        console.log(`>>> Executing migration: ${script}...`);
        try {
            execSync(`node "${fullPath}"`, {
                stdio: "inherit",
                env: process.env
            });
            console.log(`✓ Finished: ${script}\n`);
        } catch (err) {
            console.error(`✗ Error running migration script ${script}:`, err.message);
            process.exit(1);
        }
    }

    console.log("==================================================================");
    console.log("✓ All database migrations and catalog seeders executed successfully!");
    console.log("==================================================================\n");
    process.exit(0);
}

runAllMigrations();

