const bookingsService = require("./bookings.service");

exports.createBooking = async (req, res, next) => {
    try {
        const booking = await bookingsService.createBooking(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: "Booking confirmed successfully",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

exports.listMyBookings = async (req, res, next) => {
    try {
        const result = await bookingsService.listBookings(
            req.validatedQuery || req.query,
            req.user.id,
            false
        );
        res.json({
            success: true,
            data: result.bookings,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getBookingById = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const booking = await bookingsService.getBookingById(req.params.id, req.user.id, isAdmin);
        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

exports.cancelBooking = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "ADMIN";
        const booking = await bookingsService.cancelBooking(
            req.params.id,
            req.user.id,
            req.body?.reason,
            isAdmin
        );
        res.json({
            success: true,
            message: "Booking cancelled successfully",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

