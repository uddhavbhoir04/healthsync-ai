const User = require("./User");
const RefreshToken = require("./RefreshToken");
const UserAddress = require("./UserAddress");
const Doctor = require("./Doctor");
const DoctorAvailability = require("./DoctorAvailability");
const LabTest = require("./LabTest");
const DiagnosticPackage = require("./DiagnosticPackage");
const PackageTest = require("./PackageTest");
const Booking = require("./Booking");
const BookingItem = require("./BookingItem");
const DoctorAppointment = require("./DoctorAppointment");
const LabCollectionDetail = require("./LabCollectionDetail");
const PaymentTransaction = require("./PaymentTransaction");
const RefundTransaction = require("./RefundTransaction");
const WebhookEvent = require("./WebhookEvent");
const AiConversation = require("./AiConversation");
const AiMessage = require("./AiMessage");
const AiReport = require("./AiReport");
const AiKnowledgeDocument = require("./AiKnowledgeDocument");
const AiKnowledgeChunk = require("./AiKnowledgeChunk");
const AiUsageLog = require("./AiUsageLog");
const Notification = require("./Notification");
const NotificationPreference = require("./NotificationPreference");
const PushSubscription = require("./PushSubscription");
const NotificationOutbox = require("./NotificationOutbox");

// Auth & Users
User.hasMany(RefreshToken, {
    foreignKey: "userId",
    as: "refreshTokens",
    onDelete: "CASCADE"
});
RefreshToken.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

User.hasMany(UserAddress, {
    foreignKey: "userId",
    as: "addresses",
    onDelete: "CASCADE"
});
UserAddress.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

// Doctors & Availability
User.hasOne(Doctor, {
    foreignKey: "userId",
    as: "doctorProfile",
    onDelete: "SET NULL"
});
Doctor.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

Doctor.hasMany(DoctorAvailability, {
    foreignKey: "doctorId",
    as: "availability",
    onDelete: "CASCADE"
});
DoctorAvailability.belongsTo(Doctor, {
    foreignKey: "doctorId",
    as: "doctor"
});

// Lab Tests & Diagnostic Packages (Many-to-Many via PackageTest)
DiagnosticPackage.belongsToMany(LabTest, {
    through: PackageTest,
    foreignKey: "packageId",
    otherKey: "labTestId",
    as: "tests"
});
LabTest.belongsToMany(DiagnosticPackage, {
    through: PackageTest,
    foreignKey: "labTestId",
    otherKey: "packageId",
    as: "packages"
});

DiagnosticPackage.hasMany(PackageTest, {
    foreignKey: "packageId",
    as: "packageTests",
    onDelete: "CASCADE"
});
PackageTest.belongsTo(DiagnosticPackage, {
    foreignKey: "packageId",
    as: "package"
});

LabTest.hasMany(PackageTest, {
    foreignKey: "labTestId",
    as: "testPackages",
    onDelete: "CASCADE"
});
PackageTest.belongsTo(LabTest, {
    foreignKey: "labTestId",
    as: "test"
});

// Bookings & Items
User.hasMany(Booking, {
    foreignKey: "userId",
    as: "bookings"
});
Booking.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

UserAddress.hasMany(Booking, {
    foreignKey: "addressId",
    as: "bookings"
});
Booking.belongsTo(UserAddress, {
    foreignKey: "addressId",
    as: "address"
});

Booking.hasMany(BookingItem, {
    foreignKey: "bookingId",
    as: "items",
    onDelete: "CASCADE"
});
BookingItem.belongsTo(Booking, {
    foreignKey: "bookingId",
    as: "booking"
});

// Doctor Appointments
Booking.hasOne(DoctorAppointment, {
    foreignKey: "bookingId",
    as: "appointment",
    onDelete: "CASCADE"
});
DoctorAppointment.belongsTo(Booking, {
    foreignKey: "bookingId",
    as: "booking"
});

Doctor.hasMany(DoctorAppointment, {
    foreignKey: "doctorId",
    as: "appointments"
});
DoctorAppointment.belongsTo(Doctor, {
    foreignKey: "doctorId",
    as: "doctor"
});

// Lab Collection Details
Booking.hasOne(LabCollectionDetail, {
    foreignKey: "bookingId",
    as: "labCollection",
    onDelete: "CASCADE"
});
LabCollectionDetail.belongsTo(Booking, {
    foreignKey: "bookingId",
    as: "booking"
});

UserAddress.hasMany(LabCollectionDetail, {
    foreignKey: "addressId",
    as: "labCollections"
});
LabCollectionDetail.belongsTo(UserAddress, {
    foreignKey: "addressId",
    as: "address"
});

// Payments & Transactions
Booking.hasMany(PaymentTransaction, {
    foreignKey: "bookingId",
    as: "payments",
    onDelete: "CASCADE"
});
PaymentTransaction.belongsTo(Booking, {
    foreignKey: "bookingId",
    as: "booking"
});

User.hasMany(PaymentTransaction, {
    foreignKey: "userId",
    as: "payments",
    onDelete: "CASCADE"
});
PaymentTransaction.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

PaymentTransaction.hasMany(RefundTransaction, {
    foreignKey: "paymentTransactionId",
    as: "refunds",
    onDelete: "CASCADE"
});
RefundTransaction.belongsTo(PaymentTransaction, {
    foreignKey: "paymentTransactionId",
    as: "payment"
});

Booking.hasMany(RefundTransaction, {
    foreignKey: "bookingId",
    as: "refunds",
    onDelete: "CASCADE"
});
RefundTransaction.belongsTo(Booking, {
    foreignKey: "bookingId",
    as: "booking"
});

User.hasMany(RefundTransaction, {
    foreignKey: "userId",
    as: "refunds",
    onDelete: "CASCADE"
});
RefundTransaction.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

// AI Assistant (Phase 6)
User.hasMany(AiConversation, { foreignKey: "userId", as: "aiConversations", onDelete: "CASCADE" });
AiConversation.belongsTo(User, { foreignKey: "userId", as: "user" });

AiConversation.hasMany(AiMessage, { foreignKey: "conversationId", as: "messages", onDelete: "CASCADE" });
AiMessage.belongsTo(AiConversation, { foreignKey: "conversationId", as: "conversation" });

User.hasMany(AiReport, { foreignKey: "userId", as: "aiReports", onDelete: "CASCADE" });
AiReport.belongsTo(User, { foreignKey: "userId", as: "user" });

AiKnowledgeDocument.hasMany(AiKnowledgeChunk, { foreignKey: "documentId", as: "chunks", onDelete: "CASCADE" });
AiKnowledgeChunk.belongsTo(AiKnowledgeDocument, { foreignKey: "documentId", as: "document" });

AiUsageLog.belongsTo(User, { foreignKey: "userId", as: "user" });

// Notifications (Phase 7)
User.hasMany(Notification, { foreignKey: "userId", as: "notifications", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasOne(NotificationPreference, { foreignKey: "userId", as: "notificationPreferences", onDelete: "CASCADE" });
NotificationPreference.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(PushSubscription, { foreignKey: "userId", as: "pushSubscriptions", onDelete: "CASCADE" });
PushSubscription.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = {
    User,
    RefreshToken,
    UserAddress,
    Doctor,
    DoctorAvailability,
    LabTest,
    DiagnosticPackage,
    PackageTest,
    Booking,
    BookingItem,
    DoctorAppointment,
    LabCollectionDetail,
    PaymentTransaction,
    RefundTransaction,
    WebhookEvent,
    AiConversation,
    AiMessage,
    AiReport,
    AiKnowledgeDocument,
    AiKnowledgeChunk,
    AiUsageLog,
    Notification,
    NotificationPreference,
    PushSubscription,
    NotificationOutbox
};
