const { sequelize, Sequelize } = require("../../database/connection");

const Category = sequelize.define(
    "category",
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        category_name: {
            type: Sequelize.STRING
        },
        parent_id: {
            type: Sequelize.INTEGER
        },
        description: {
            type: Sequelize.STRING,
            allowNull: true
        },
        category_status: {
            type: Sequelize.TINYINT
        }
    },
    {
        tableName: "category",
        createdAt: false,
        updatedAt: false
    }
);

const Subcategory = sequelize.define(
    "subcategory",
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        subcategory_name: {
            type: Sequelize.STRING
        },
        category_id: {
            type: Sequelize.INTEGER,
            references: {
                model: 'category',
                key: 'id'
            },
            field: 'category_id'
        },
        description: {
            type: Sequelize.STRING,
            allowNull: true
        }, points: {
            type: Sequelize.NUMBER,
        },
        subcategory_status: {
            type: Sequelize.TINYINT
        }
    },
    {
        tableName: "subcategory",
        createdAt: false,
        updatedAt: false
    }
);

Category.hasMany(Subcategory, { foreignKey: 'category_id' });
Subcategory.belongsTo(Category, { foreignKey: 'id' });
module.exports = { Category, Subcategory };