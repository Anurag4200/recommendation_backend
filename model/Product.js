
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  product_id: { type: Number, required: true, unique: true },
  product_name: { type: String, required: true },
  aisle_id: { type: Number },
  department_id: { type: Number },
  image_url: { type: String }, 
});

module.exports = mongoose.model("Product", ProductSchema);
