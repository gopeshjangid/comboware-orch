var mysql = require('mysql');
const config = require("../config");
require("dotenv").config();
const DB = mysql.createConnection({
  host: process.env?.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME
});

DB.connect();
const Sequelize = require("sequelize");

// create connection
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PWD, {
    host: process.env?.DB_HOST,
    dialect: 'mysql'
});

module.exports = {DB, sequelize, Sequelize};