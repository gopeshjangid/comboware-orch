const { Category, Subcategory } = require("../models/orm/ormCategory");
var API = require("../utils.js");
class CategoryController {

  static saveCategory = async (req, res) => {
    try {
      let where = {
        category_name: req?.body?.category_name
      }
      if (req?.body?.id) {
        where = {
          id: req?.body?.id
        }
      }
      let checkCats = await Category.findAll({
        where: where
      });
      // console.log('----', checkCats);
      if (checkCats && checkCats.length) {
        await Category.update(req?.body, {
          where: {
            id: checkCats[0].id
          }
        });
      } else {
        await Category.create(req?.body);
      }
      checkCats = await Category.findAll({
        where: {
          category_name: req?.body?.category_name
        }
      });
      return res.status(200).json({ data: checkCats[0] || null, status: true, message: "Category created successfully" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in creating category." });
    }
  }

  static saveSubcategory = async (req, res) => {
    try {
      let where = {
        subcategory_name: req?.body?.subcategory_name,
        category_id: req?.body?.category_id
      }
      if (req?.body?.id) {
        where = {
          id: req?.body?.id
        }
      }
      let checkSubcats = await Subcategory.findAll({
        where: where
      });
      // console.log(checkSubcats); return;
      if (checkSubcats && checkSubcats.length) {
        await Subcategory.update(req?.body, {
          where: {
            id: checkSubcats[0].id
          }
        });
      } else {
        await Subcategory.create(req?.body);
      }
      checkSubcats = await Subcategory.findAll({
        where: {
          subcategory_name: req?.body?.subcategory_name,
          category_id: req?.body?.category_id
        }
      });
      return res.status(200).json({ data: checkSubcats[0] || null, status: true, message: "Subcategory created successfully" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in creating subcategory." });
    }
  }

  static enableDisableCatSubcat = async (req, res) => {
    try {
      let id = req?.body?.id || 0;
      let type = req?.body?.type || false;
      let action = req?.body?.status? "enable" : "disable";
      let data;
      if(type==='category'){
        await Category.update({category_status: req?.body?.status}, {
          where: {
            id: id
          }
        });
        data = await Category.findAll({
          where: {
            id: id
          }
        });
      }
      if(type==='subcategory'){
        await Subcategory.update({subcategory_status: req?.body?.status}, {
          where: {
            id: id
          }
        });
        data = await Subcategory.findAll({
          where: {
            id: id
          }
        });
      }
      
      return res.status(200).json({ data: data || null, status: true, message: `${type} ${action} successfully`});
    } catch (err) {
      console.log(err);
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in enable/disable category." });
    }
  }

  static getAllCategories = async (req, res) => {
    try {
      // let checkCats = await Category.findAll();
      let data = await Category.findAll({
        include: [{
          model: Subcategory,
          // as: 'subcategory',
          attributes: ['id', 'subcategory_name', 'category_id' ,'points', "subcategory_status"]
        }]
      })
      return res.status(200).json({ data: data || [], status: true, message: "Fetched categories." });
      // console.log(JSON.stringify(data)); return;
    } catch (err) {
      console.log(err);
      return res.status(500).json({ data: null, status: false, message: error || error?.data || "Error in fetching categories." });
    }
  }

}

module.exports = CategoryController;
