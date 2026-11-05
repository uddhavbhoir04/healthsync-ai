const bookingsService = require("./bookings.service");

exports.listAllBookings = async (req, res, next) => {
    try {
        const result = await bookingsService.listBookings(
            req.validatedQuery || req.query,
            null,
            true
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

exports.getAdminBookingById = async (req, res, next) => {
    try {
        const booking = await bookingsService.getBookingById(req.params.id, null, true);
        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

exports.updateBookingStatus = async (req, res, next) => {
    try {
        const booking = await bookingsService.adminUpdateBookingStatus(req.params.id, req.body);
        res.json({
            success: true,
            message: "Booking status updated successfully",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

exports.adminCancelBooking = async (req, res, next) => {
    try {
        const booking = await bookingsService.cancelBooking(
            req.params.id,
            null,
            req.body?.reason || "Cancelled by administrator",
            true
        );
        res.json({
            success: true,
            message: "Booking cancelled successfully by admin",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

