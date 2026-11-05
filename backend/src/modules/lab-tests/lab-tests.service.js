const { Op } = require("sequelize");
const { LabTest } = require("../../models");
const { getCache, setCache, invalidatePattern } = require("../../utils/cache");

async function listLabTests(params, isAdmin = false) {
    const {
        page = 1,
        limit = 10,
        search,
        category,
        fastingRequired,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        sortOrder = "DESC"
    } = params;

    const cacheKey = !isAdmin ? `tests:list:${JSON.stringify(params)}` : null;
    if (cacheKey) {
        const cached = await getCache(cacheKey);
        if (cached) return cached;
    }

    const where = {};

    if (!isAdmin) {
        where.status = true;
    } else if (params.status !== undefined && params.status !== "all") {
        where.status = params.status === "true" || params.status === true;
    }

    if (search && search.trim() !== "") {
        const sanitized = `%${search.trim()}%`;
        where[Op.or] = [
            { testName: { [Op.like]: sanitized } },
            { testCode: { [Op.like]: sanitized } },
            { description: { [Op.like]: sanitized } },
            { category: { [Op.like]: sanitized } }
        ];
    }

    if (category && category !== "all") {
        where.category = category;
    }

    if (typeof fastingRequired === "boolean") {
        where.fastingRequired = fastingRequired;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price[Op.gte] = Number(minPrice);
        if (maxPrice !== undefined) where.price[Op.lte] = Number(maxPrice);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LabTest.findAndCountAll({
        where,
        order: [[sortBy, sortOrder.toUpperCase()]],
        offset,
        limit
    });

    const result = {
        tests: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit) || 1
        }
    };

    if (cacheKey) {
        await setCache(cacheKey, result, 300);
    }

    return result;
}

async function getLabTestCategories() {
    const cacheKey = "tests:categories";
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const categories = await LabTest.findAll({
        attributes: ["category"],
        where: { status: true },
        group: ["category"],
        order: [["category", "ASC"]]
    });

    const result = categories.map((c) => c.category);
    await setCache(cacheKey, result, 600);
    return result;
}

async function getLabTestById(id, isAdmin = false) {
    const where = { id };
    if (!isAdmin) {
        where.status = true;
    }

    const test = await LabTest.findOne({ where });
    if (!test) {
        const error = new Error("Lab test not found");
        error.status = 404;
        throw error;
    }

    return test;
}

async function createLabTest(payload) {
    // Check testCode uniqueness
    const existing = await LabTest.findOne({ where: { testCode: payload.testCode } });
    if (existing) {
        const error = new Error(`Lab test with code '${payload.testCode}' already exists`);
        error.status = 400;
        throw error;
    }

    const test = await LabTest.create(payload);
    await invalidatePattern("tests:");
    await invalidatePattern("search:");
    await invalidatePattern("packages:");
    return test;
}

async function updateLabTest(id, payload) {
    const test = await LabTest.findByPk(id);
    if (!test) {
        const error = new Error("Lab test not found");
        error.status = 404;
        throw error;
    }

    if (payload.testCode && payload.testCode !== test.testCode) {
        const existing = await LabTest.findOne({
            where: { testCode: payload.testCode, id: { [Op.ne]: id } }
        });
        if (existing) {
            const error = new Error(`Lab test with code '${payload.testCode}' already exists`);
            error.status = 400;
            throw error;
        }
    }

    await test.update(payload);
    await invalidatePattern("tests:");
    await invalidatePattern("search:");
    await invalidatePattern("packages:");
    return test;
}

async function updateLabTestStatus(id, status) {
    const test = await LabTest.findByPk(id);
    if (!test) {
        const error = new Error("Lab test not found");
        error.status = 404;
        throw error;
    }

    await test.update({ status });
    await invalidatePattern("tests:");
    await invalidatePattern("search:");
    await invalidatePattern("packages:");
    return test;
}

async function deleteLabTest(id) {
    const test = await LabTest.findByPk(id);
    if (!test) {
        const error = new Error("Lab test not found");
        error.status = 404;
        throw error;
    }

    await test.update({ status: false });
    await invalidatePattern("tests:");
    await invalidatePattern("search:");
    await invalidatePattern("packages:");
    return { id, message: "Lab test deactivated successfully" };
}

module.exports = {
    listLabTests,
    getLabTestCategories,
    getLabTestById,
    createLabTest,
    updateLabTest,
    updateLabTestStatus,
    deleteLabTest
};

