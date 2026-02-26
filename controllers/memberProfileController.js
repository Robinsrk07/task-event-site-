const { requestProfileUpdate, getChangeRequestStatus, cancelChangeRequest } = require('../services/memberProfileService');
const { successResponse } = require('../utils/responseHelper');

// Request Profile Update
const requestUpdate = async (req, res) => {
  const memberId = req.member._id;
  const { requestedChanges } = req.body;

  const result = await requestProfileUpdate(memberId, requestedChanges);
  
  successResponse(res, result, result.message);
};

// Get Change Request Status
const getStatus = async (req, res) => {
  const memberId = req.member._id;

  const result = await getChangeRequestStatus(memberId);
  
  successResponse(res, result, result.message);
};

// Cancel Pending Request
const cancelRequest = async (req, res) => {
  const memberId = req.member._id;

  const result = await cancelChangeRequest(memberId);
  
  successResponse(res, result, result.message);
};

module.exports = {
  requestUpdate,
  getStatus,
  cancelRequest,
};
