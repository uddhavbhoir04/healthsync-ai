const { Op } = require("sequelize");
const { Doctor, LabTest, DiagnosticPackage } = require("../../models");
const { getCache, setCache } = require("../../utils/cache");

async function globalSearch({ q = "", type = "ALL", city, pincode, limit = 8, page = 1 }) {
    const trimmed = q.trim();
    const parsedLimit = Math.min(Number(limit) || 8, 30);
    const parsedPage = Number(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    // Cache key for search query
    const cacheKey = `search:${trimmed.toLowerCase()}:${type}:${city || ""}:${pincode || ""}:${parsedLimit}:${parsedPage}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const sanitized = trimmed ? `%${trimmed}%` : null;

    const results = {
        doctors: [],
        labTests: [],
        packages: []
    };

    const counts = {
        doctors: 0,
        labTests: 0,
        packages: 0,
        total: 0
    };

    // 1. Search DOCTORS
    if (type === "ALL" || type === "DOCTOR") {
        const doctorWhere = { status: true };
        if (sanitized) {
            doctorWhere[Op.or] = [
                { doctorName: { [Op.like]: sanitized } },
                { specialization: { [Op.like]: sanitized } },
                { qualification: { [Op.like]: sanitized } },
                { city: { [Op.like]: sanitized } }
            ];
        }
        if (city) doctorWhere.city = city;
        if (pincode) doctorWhere.pincode = pincode;

        const { count, rows } = await Doctor.findAndCountAll({
            where: doctorWhere,
            limit: parsedLimit,
            offset,
            order: [["experienceYears", "DESC"]]
        });
        results.doctors = rows;
        counts.doctors = count;
    }

    // 2. Search LAB TESTS
    if (type === "ALL" || type === "LAB_TEST") {
        const testWhere = { status: true };
        if (sanitized) {
            testWhere[Op.or] = [
                { testName: { [Op.like]: sanitized } },
                { testCode: { [Op.like]: sanitized } },
                { category: { [Op.like]: sanitized } },
                { description: { [Op.like]: sanitized } }
            ];
        }

        const { count, rows } = await LabTest.findAndCountAll({
            where: testWhere,
            limit: parsedLimit,
            offset,
            order: [["price", "ASC"]]
        });
        results.labTests = rows;
        counts.labTests = count;
    }

    // 3. Search PACKAGES
    if (type === "ALL" || type === "PACKAGE") {
        const pkgWhere = { status: true };
        if (sanitized) {
            pkgWhere[Op.or] = [
                { packageName: { [Op.like]: sanitized } },
                { packageCode: { [Op.like]: sanitized } },
                { description: { [Op.like]: sanitized } }
            ];
        }

        const { count, rows } = await DiagnosticPackage.findAndCountAll({
            where: pkgWhere,
            limit: parsedLimit,
            offset,
            order: [["offerPrice", "ASC"]],
            include: [
                {
                    model: LabTest,
                    as: "tests",
                    attributes: ["id", "testName", "category"],
                    through: { attributes: [] }
                }
            ]
        });

        results.packages = rows.map((p) => {
            const item = p.toJSON();
            const orig = Number(item.originalPrice) || 0;
            const offer = Number(item.offerPrice) || 0;
            item.savings = Math.max(0, orig - offer);
            item.testCount = item.tests?.length || 0;
            return item;
        });
        counts.packages = count;
    }

    counts.total = counts.doctors + counts.labTests + counts.packages;

    const finalResult = {
        query: trimmed,
        type,
        results,
        counts,
        pagination: {
            page: parsedPage,
            limit: parsedLimit
        }
    };

    // Cache popular searches for 5 minutes
    await setCache(cacheKey, finalResult, 300);

    return finalResult;
}

module.exports = {
    globalSearch
};

