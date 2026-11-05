/**
 * Read-only application tools exposed to Gemini function calling.
 * - The authenticated user's ID is injected by the server; the model can never choose it.
 * - Arguments are validated with zod before execution.
 * - Output is trimmed to non-sensitive fields and treated as untrusted data.
 * - There are intentionally NO write tools (booking, cancellation, payment, refund).
 */
const { z } = require("zod");
const appointmentsService = require("../appointments/appointments.service");
const bookingsService = require("../bookings/bookings.service");
const labTestsService = require("../lab-tests/lab-tests.service");
const packagesService = require("../packages/packages.service");

const todayStr = () => new Date().toISOString().slice(0, 10);

const TOOLS = {
    get_my_upcoming_appointments: {
        declaration: {
            name: "get_my_upcoming_appointments",
            description: "Get the current user's own upcoming doctor appointments (date, time, doctor, status). Read-only.",
            parametersJsonSchema: {
                type: "object",
                properties: {
                    limit: { type: "integer", description: "Maximum number of appointments (1-10)", minimum: 1, maximum: 10 }
                }
            }
        },
        schema: z.object({ limit: z.coerce.number().int().min(1).max(10).default(5) }),
        async run(userId, args) {
            const { appointments } = await appointmentsService.getMyAppointments(userId, { page: 1, limit: 50 });
            const today = todayStr();
            return appointments
                .map((a) => (typeof a.toJSON === "function" ? a.toJSON() : a))
                .filter((a) => a.appointmentDate >= today && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.appointmentStatus))
                .sort((x, y) => `${x.appointmentDate} ${x.startTime}`.localeCompare(`${y.appointmentDate} ${y.startTime}`))
                .slice(0, args.limit)
                .map((a) => ({
                    bookingNumber: a.booking?.bookingNumber,
                    date: a.appointmentDate,
                    startTime: a.startTime,
                    endTime: a.endTime,
                    consultationType: a.consultationType,
                    status: a.appointmentStatus,
                    doctor: a.doctor ? { name: a.doctor.doctorName, specialization: a.doctor.specialization } : null
                }));
        }
    },
    get_my_bookings: {
        declaration: {
            name: "get_my_bookings",
            description: "Get the current user's own booking history (lab tests, packages and doctor consultations), with booked item names and status. Read-only.",
            parametersJsonSchema: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["DOCTOR", "LAB_TEST", "PACKAGE"], description: "Optional booking type filter" },
                    limit: { type: "integer", minimum: 1, maximum: 10 }
                }
            }
        },
        schema: z.object({
            type: z.enum(["DOCTOR", "LAB_TEST", "PACKAGE"]).optional(),
            limit: z.coerce.number().int().min(1).max(10).default(5)
        }),
        async run(userId, args) {
            const { bookings } = await bookingsService.listBookings({ page: 1, limit: args.limit, type: args.type }, userId, false);
            return bookings.map((b) => {
                const booking = typeof b.toJSON === "function" ? b.toJSON() : b;
                return {
                    bookingNumber: booking.bookingNumber,
                    type: booking.bookingType,
                    status: booking.bookingStatus,
                    paymentStatus: booking.paymentStatus,
                    bookingDate: booking.bookingDate,
                    collectionDate: booking.labCollection?.preferredDate || null,
                    collectionType: booking.labCollection?.collectionType || null,
                    items: (booking.items || []).map((i) => ({ type: i.itemType, itemId: i.itemId, name: i.itemName }))
                };
            });
        }
    },
    get_lab_test_info: {
        declaration: {
            name: "get_lab_test_info",
            description: "Look up lab tests in the HealthSync catalog by name or code, returning description, sample type, fasting requirement and preparation instructions. Read-only.",
            parametersJsonSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Test name or code, e.g. 'CBC' or 'HbA1c'" },
                    testId: { type: "integer", description: "Exact catalog test ID if known" }
                }
            }
        },
        schema: z.object({
            query: z.string().trim().min(1).max(100).optional(),
            testId: z.coerce.number().int().positive().optional()
        }).refine((v) => v.query || v.testId, { message: "query or testId required" }),
        async run(_userId, args) {
            const pick = (t) => ({
                id: t.id,
                name: t.testName,
                code: t.testCode,
                category: t.category,
                description: t.description,
                sampleType: t.sampleType,
                fastingRequired: t.fastingRequired,
                preparationInstructions: t.preparationInstructions
            });
            if (args.testId) {
                const test = await labTestsService.getLabTestById(args.testId, false).catch(() => null);
                return test ? [pick(test)] : [];
            }
            const result = await labTestsService.listLabTests({ page: 1, limit: 3, search: args.query }, false);
            return (result.tests || result.labTests || result.data || []).map(pick);
        }
    },
    get_package_details: {
        declaration: {
            name: "get_package_details",
            description: "Look up a diagnostic package in the HealthSync catalog and list the tests it includes. Read-only.",
            parametersJsonSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Package name" },
                    packageId: { type: "integer", description: "Exact catalog package ID if known" }
                }
            }
        },
        schema: z.object({
            query: z.string().trim().min(1).max(100).optional(),
            packageId: z.coerce.number().int().positive().optional()
        }).refine((v) => v.query || v.packageId, { message: "query or packageId required" }),
        async run(_userId, args) {
            let id = args.packageId;
            if (!id) {
                const result = await packagesService.listPackages({ page: 1, limit: 1, search: args.query }, false);
                const first = (result.packages || result.data || [])[0];
                if (!first) return [];
                id = first.id;
            }
            const pkg = await packagesService.getPackageById(id, false).catch(() => null);
            if (!pkg) return [];
            return [{
                id: pkg.id,
                name: pkg.packageName,
                description: pkg.description,
                tests: (pkg.tests || []).map((t) => ({
                    name: t.testName,
                    code: t.testCode,
                    sampleType: t.sampleType,
                    fastingRequired: t.fastingRequired
                }))
            }];
        }
    }
};

const functionDeclarations = Object.values(TOOLS).map((t) => t.declaration);

/**
 * Execute a model-requested tool call for the authenticated user.
 * Never throws: returns { error } so the model can respond gracefully.
 */
async function executeTool(name, rawArgs, userId) {
    const tool = TOOLS[name];
    if (!tool) return { error: "Unknown tool" };
    if (!userId) return { error: "Not authenticated" };

    // Strip any user-identifying args the model may try to inject
    const { userId: _ignored, user_id: _ignored2, ...args } = rawArgs || {};
    const parsed = tool.schema.safeParse(args);
    if (!parsed.success) return { error: "Invalid arguments" };

    try {
        const data = await tool.run(userId, parsed.data);
        return { data };
    } catch (err) {
        console.warn(`AI tool ${name} failed:`, err.message);
        return { error: "Data temporarily unavailable" };
    }
}

module.exports = { functionDeclarations, executeTool, TOOLS };
