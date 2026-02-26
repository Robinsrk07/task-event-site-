const { getAllProfileChangeRequests, getProfileChangeRequestDetails, reviewProfileChangeRequest } = require('../services/adminProfileService');
const { successResponse } = require('../utils/responseHelper');

// Get All Profile Change Requests
const getAllRequests = async (req, res) => {
  const { status, page, limit } = req.query;
  
  const filters = { status };
  const pagination = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  };

  const result = await getAllProfileChangeRequests(filters, pagination);
  
  successResponse(res, result, 'Profile change requests retrieved successfully');
};

// Get Detailed Profile Change Request
const getRequestDetails = async (req, res) => {
  const { userId } = req.params;

  const result = await getProfileChangeRequestDetails(userId);
  
  successResponse(res, result, 'Profile change request details retrieved successfully');
};

// Review Profile Change Request (Approve/Reject)
const reviewRequest = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.admin._id;
  const { action, remarks } = req.body;

  const result = await reviewProfileChangeRequest(userId, adminId, action, remarks);
  
  successResponse(res, result, result.message);
};

module.exports = {
  getAllRequests,
  getRequestDetails,
  reviewRequest,
};
