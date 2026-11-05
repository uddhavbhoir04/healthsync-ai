const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config(); // fallback to cwd

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        dialect: "mysql",

        logging: false,

        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },

        dialectOptions:
            process.env.DB_SSL === "true"
                ? {
                    ssl: {
                        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
                        ca: process.env.DB_CA_CERT || undefined
                    }
                }
                : {}
    }
);

module.exports = sequelize;