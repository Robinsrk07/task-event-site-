const { createPaymentOrder, verifyPayment, getPaymentStatus } = require('../services/paymentService');
const { successResponse } = require('../utils/responseHelper');

// Get Payment Status
const getStatus = async (req, res) => {
  const memberId = req.member._id;

  const result = await getPaymentStatus(memberId);
  
  successResponse(res, result, 'Payment status retrieved successfully');
};

// Create Payment Order
const createOrder = async (req, res) => {
  const memberId = req.member._id;

  const result = await createPaymentOrder(memberId);
  
  successResponse(res, result, 'Payment order created successfully');
};

// Verify Payment (Razorpay Callback)
const verify = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const result = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  
  successResponse(res, result, result.message || 'Payment verified successfully');
};

module.exports = {
  getStatus,
  createOrder,
  verify,
};
