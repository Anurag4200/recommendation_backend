// cleanupProducts.js
const mongoose = require("mongoose");
const Product = require("./model/Product");

mongoose.connect("mongodb://127.0.0.1:27017/recommendationDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  try {
    const products = await Product.find({});

    for (let product of products) {
      // Remove "Product XXX " prefix
      const cleanedName = product.product_name.replace(/^Product\s+\d+\s+/i, "");
      if (cleanedName !== product.product_name) {
        product.product_name = cleanedName;
        await product.save();
        console.log(`✅ Updated: ${cleanedName}`);
      }
    }

    console.log("🎉 Cleanup finished!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error cleaning products:", err);
    mongoose.connection.close();
  }
})();
