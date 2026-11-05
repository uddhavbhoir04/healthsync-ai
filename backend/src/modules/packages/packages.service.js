const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const { DiagnosticPackage, LabTest, PackageTest } = require("../../models");
const { getCache, setCache, invalidatePattern } = require("../../utils/cache");

async function listPackages(params, isAdmin = false) {
    const {
        page = 1,
        limit = 10,
        search,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        sortOrder = "DESC"
    } = params;

    const cacheKey = !isAdmin ? `packages:list:${JSON.stringify(params)}` : null;
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
            { packageName: { [Op.like]: sanitized } },
            { packageCode: { [Op.like]: sanitized } },
            { description: { [Op.like]: sanitized } }
        ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        where.offerPrice = {};
        if (minPrice !== undefined) where.offerPrice[Op.gte] = Number(minPrice);
        if (maxPrice !== undefined) where.offerPrice[Op.lte] = Number(maxPrice);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await DiagnosticPackage.findAndCountAll({
        where,
        order: [[sortBy, sortOrder.toUpperCase()]],
        offset,
        limit,
        include: [
            {
                model: LabTest,
                as: "tests",
                attributes: ["id", "testName", "testCode", "category", "price", "sampleType"],
                through: { attributes: [] }
            }
        ]
    });

    const formattedPackages = rows.map((pkg) => {
        const item = pkg.toJSON();
        const orig = Number(item.originalPrice) || 0;
        const offer = Number(item.offerPrice) || 0;
        item.savings = Math.max(0, orig - offer);
        item.testCount = item.tests?.length || 0;
        return item;
    });

    const result = {
        packages: formattedPackages,
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

async function getPackageById(id, isAdmin = false) {
    const where = { id };
    if (!isAdmin) {
        where.status = true;
    }

    const pkg = await DiagnosticPackage.findOne({
        where,
        include: [
            {
                model: LabTest,
                as: "tests",
                attributes: [
                    "id",
                    "testName",
                    "testCode",
                    "description",
                    "category",
                    "sampleType",
                    "fastingRequired",
                    "preparationInstructions",
                    "price"
                ],
                through: { attributes: [] }
            }
        ]
    });

    if (!pkg) {
        const error = new Error("Diagnostic package not found");
        error.status = 404;
        throw error;
    }

    const item = pkg.toJSON();
    const orig = Number(item.originalPrice) || 0;
    const offer = Number(item.offerPrice) || 0;
    item.savings = Math.max(0, orig - offer);
    item.testCount = item.tests?.length || 0;
    return item;
}

async function createPackage(payload) {
    const { testIds = [], ...packageData } = payload;

    if (Number(packageData.offerPrice) > Number(packageData.originalPrice)) {
        const error = new Error("Offer price cannot exceed original price");
        error.status = 400;
        throw error;
    }

    const existing = await DiagnosticPackage.findOne({ where: { packageCode: packageData.packageCode } });
    if (existing) {
        const error = new Error(`Package with code '${packageData.packageCode}' already exists`);
        error.status = 400;
        throw error;
    }

    return sequelize.transaction(async (transaction) => {
        const pkg = await DiagnosticPackage.create(packageData, { transaction });

        if (Array.isArray(testIds) && testIds.length > 0) {
            const mappings = testIds.map((testId) => ({
                packageId: pkg.id,
                labTestId: testId
            }));
            await PackageTest.bulkCreate(mappings, { transaction });
        }

        await invalidatePattern("packages:");
        await invalidatePattern("search:");

        return getPackageById(pkg.id, true);
    });
}

async function updatePackage(id, payload) {
    const { testIds, ...packageData } = payload;

    const pkg = await DiagnosticPackage.findByPk(id);
    if (!pkg) {
        const error = new Error("Diagnostic package not found");
        error.status = 404;
        throw error;
    }

    const finalOrig = packageData.originalPrice !== undefined ? Number(packageData.originalPrice) : Number(pkg.originalPrice);
    const finalOffer = packageData.offerPrice !== undefined ? Number(packageData.offerPrice) : Number(pkg.offerPrice);

    if (finalOffer > finalOrig) {
        const error = new Error("Offer price cannot exceed original price");
        error.status = 400;
        throw error;
    }

    return sequelize.transaction(async (transaction) => {
        await pkg.update(packageData, { transaction });

        if (Array.isArray(testIds)) {
            // Remove old mappings
            await PackageTest.destroy({
                where: { packageId: id },
                transaction
            });

            // Re-insert new mappings
            if (testIds.length > 0) {
                const mappings = testIds.map((testId) => ({
                    packageId: id,
                    labTestId: testId
                }));
                await PackageTest.bulkCreate(mappings, { transaction });
            }
        }

        await invalidatePattern("packages:");
        await invalidatePattern("search:");

        return getPackageById(id, true);
    });
}

async function updatePackageStatus(id, status) {
    const pkg = await DiagnosticPackage.findByPk(id);
    if (!pkg) {
        const error = new Error("Diagnostic package not found");
        error.status = 404;
        throw error;
    }

    await pkg.update({ status });
    await invalidatePattern("packages:");
    await invalidatePattern("search:");
    return pkg;
}

async function deletePackage(id) {
    const pkg = await DiagnosticPackage.findByPk(id);
    if (!pkg) {
        const error = new Error("Diagnostic package not found");
        error.status = 404;
        throw error;
    }

    await pkg.update({ status: false });
    await invalidatePattern("packages:");
    await invalidatePattern("search:");
    return { id, message: "Diagnostic package deactivated successfully" };
}

module.exports = {
    listPackages,
    getPackageById,
    createPackage,
    updatePackage,
    updatePackageStatus,
    deletePackage
};

