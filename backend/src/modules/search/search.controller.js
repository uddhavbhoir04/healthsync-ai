const searchService = require("./search.service");

exports.search = async (req, res, next) => {
    try {
        const { q, type, city, pincode, limit, page } = req.query;
        const data = await searchService.globalSearch({
            q: q || "",
            type: (type || "ALL").toUpperCase(),
            city,
            pincode,
            limit,
            page
        });

        res.json({
            success: true,
            data,
            ...data
        });
    } catch (error) {
        next(error);
    }
};

