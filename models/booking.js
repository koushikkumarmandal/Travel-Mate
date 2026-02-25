const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  checkIn: Date,
  checkOut: Date,
  totalDays: Number,
  totalPrice: Number,

  
  adults: {
    type: Number,
    required: true,
    min: 1,
  },

  children: {
    type: Number,
    default: 0,
    min: 0,
  },

  paymentStatus: {
    type: String,
    default: "Pending",
  },

  status: {
    type: String,
    default: "active",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);
