const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Product = require("../model/Product");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Fuse = require("fuse.js");

const genAI = new GoogleGenerativeAI("AIzaSyAae28eohipMlLb2EOxKUQUFMBeh-Zi-fQ");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

router.get("/genai/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    //  Step 1: Fetch all product names from DB
    const products = await Product.find({}, "product_id product_name image_url");
    const productList = products.map(p => p.product_name);

    // Step 2: Prepare user context
    const userContext = `
      User preferences: ${user.preferences?.join(", ") || "none"}
      Recent purchases: ${user.recent_purchases_summary || "none"}
    `;

    // Step 3: Prompt Gemini to suggest products ONLY from DB list
    const prompt = `
      You are a grocery recommendation system.
      The user has these preferences and history:
      ${userContext}

      Here is the catalog of available products:
      ${productList.join(", ")}

      Suggest 5 products ONLY from this catalog that the user might like.
      Return as a JSON array of product names, nothing else.
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();

    // Clean JSON output (remove ```json blocks if any)
    rawText = rawText.replace(/```json|```/g, "").trim();

    let genaiSuggestions = [];
    try {
      genaiSuggestions = JSON.parse(rawText);
    } catch (err) {
      console.error("GenAI JSON parse failed:", rawText);
      return res.status(500).json({ error: "GenAI response parsing failed", raw: rawText });
    }

    // Step 4: Fuzzy match suggestions with DB
    const fuse = new Fuse(products, {
      keys: ["product_name"],
      threshold: 0.4, // More forgiving than before
    });

    let matchedProducts = [];
    for (const suggestion of genaiSuggestions) {
      const match = fuse.search(suggestion)[0];
      if (match) {
        matchedProducts.push({
          product_id: match.item.product_id,
          product_name: match.item.product_name,
          image_url: match.item.image_url,
        });
      }
    }

    // Step 5: Fallback to popular if no matches
    if (matchedProducts.length === 0) {
      const popularProducts = await Product.aggregate([
        { $sample: { size: 5 } } // random 5 as fallback
      ]);
      return res.json({
        status: "success",
        data: popularProducts,
        genai_raw: genaiSuggestions,
        note: "Fallback: showing random popular products",
      });
    }

    //  Success response
    res.json({
      status: "success",
      data: matchedProducts,
      genai_raw: genaiSuggestions,
    });

  } catch (err) {
    console.error("GenAI route error:", err);
    res.status(500).json({ error: "Failed to fetch GenAI recommendations" });
  }
});


//  1. Popular Products
router.get("/popular", async (req, res) => {
  try {
    const popularProducts = await User.aggregate([
      { $unwind: "$orders" }, // break orders array
      { $unwind: "$orders.products" }, // break products array
      { $group: { _id: "$orders.products.product_id", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "product_id",
          as: "product_info"
        }
      },
      { $unwind: "$product_info" },
      {
        $project: {
          _id: 0,
          product_id: "$product_info.product_id",
          product_name: "$product_info.product_name",
          image_url: "$product_info.image_url",
          department: "$product_info.department",
          aisle: "$product_info.aisle",
          purchase_count: "$count"
        }
      }
    ]);

    res.json({ status: "success", data: popularProducts });
  } catch (err) {
    console.error("Error fetching popular products:", err);
    res.status(500).json({ status: "error", message: "Failed to fetch popular products" });
  }
});


//  2. Content-Based Recommendations 
router.get("/content/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.userId });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    const lastOrder = user.orders[user.orders.length - 1];
    if (!lastOrder) return res.json({ status: "success", message: "No order history", data: [] });

    // Get the most recent purchased product
    const recentProduct = lastOrder.products[lastOrder.products.length - 1];
    const fullProduct = await Product.findOne({ product_id: recentProduct.product_id });

    if (!fullProduct) {
      return res.json({ status: "success", message: "No product info found", data: [] });
    }

    // Find similar products in same department/aisle
    const similarProducts = await Product.find({
      $or: [
        { department_id: fullProduct.department_id },
        { aisle_id: fullProduct.aisle_id }
      ],
      product_id: { $ne: fullProduct.product_id }
    }).limit(10);

    res.json({ status: "success", data: similarProducts });
  } catch (err) {
    console.error("Error fetching content-based recommendations:", err);
    res.status(500).json({ status: "error", message: "Failed to fetch content-based recommendations" });
  }
});


module.exports = router;
