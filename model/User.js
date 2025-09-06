const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  name: { type: String },
  email: { type: String, unique: true },

  cart: [
    {
      product_id: { type: Number, required: true },
      product_name: { type: String },
      image_url: { type: String },
      quantity: { type: Number, default: 1 }
    }
  ],


  wishlist: [
    {
      product_id: { type: Number, required: true },
      product_name: { type: String },
      image_url: { type: String }
    }
  ],


  orders: [
    {
      order_id: { type: Number },
      products: [
        {
          product_id: { type: Number, required: true },
          product_name: { type: String },
          image_url: { type: String },
          quantity: { type: Number, default: 1 }
        }
      ],
      order_date: { type: Date, default: Date.now }
    }
  ],

  interactions: [
    {
      product_id: { type: Number },
      action: { 
        type: String, 
        enum: ["view", "click", "add_to_cart", "purchase", "skip"] 
      },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  preferences: { type: [String] },
  recent_purchases_summary: { type: String }, // last 5 products in text (for LLM input)


  recommendations: [
    {
      product_id: { type: Number },
      product_name: { type: String },
      image_url: { type: String },
      source: { type: String }
    }
  ],

  demographics: {
    age: { type: Number },
    location: { type: String },
    household_size: { type: Number }
  }
});

module.exports = mongoose.model("User", UserSchema);
