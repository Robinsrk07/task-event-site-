const { getPendingApprovals, getPendingApprovalsByRole, updateMemberApproval, deleteUserProfile } = require('../services/memberService');
const { successResponse } = require('../utils/responseHelper');
const ApiError = require('../utils/ApiError');

// Get all members pending approval (any role)
const getPendingApprovalsController = async (req, res) => {
  // Get pagination params
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Validate pagination
  if (page < 1) {
    throw new ApiError(400, 'Page number must be greater than 0');
  }
  if (limit < 1 || limit > 100) {
    throw new ApiError(400, 'Limit must be between 1 and 100');
  }

  // Get pending approvals
  const data = await getPendingApprovals(page, limit);

  successResponse(
    res,
    data,
    'Pending approvals retrieved successfully'
  );
};

// Get members pending approval for specific role
const getPendingApprovalsByRoleController = async (req, res) => {
  const { role } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Validate pagination
  if (page < 1) {
    throw new ApiError(400, 'Page number must be greater than 0');
  }
  if (limit < 1 || limit > 100) {
    throw new ApiError(400, 'Limit must be between 1 and 100');
  }

  // Get pending approvals for specific role
  const data = await getPendingApprovalsByRole(role, page, limit);

  successResponse(
    res,
    data,
    `Members pending ${role} approval retrieved successfully`
  );
};

// Update member approval (approve/reject)
const updateMemberApprovalController = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body;
  
  // Get admin role from authenticated admin
  const adminRole = req.admin.role;

  // Validate admin role (only president, secretary, treasurer can approve)
  const validRoles = ['president', 'secretary', 'treasurer'];
  if (!validRoles.includes(adminRole)) {
    throw new ApiError(403, 'Only President, Secretary, or Treasurer can approve/reject members');
  }

  // Update approval
  const result = await updateMemberApproval(id, adminRole, action, remarks);

  successResponse(
    res,
    {
      memberId: result.memberId,
      memberName: result.memberName,
      updatedApproval: result.updatedApproval,
      allApproved: result.allApproved,
      status: result.status,
      paymentPending: result.paymentPending,
    },
    result.message
  );
};

// Delete user profile entirely
const deleteUserController = async (req, res) => {
  const { id } = req.params;

  // Get admin details
  const adminRole = req.admin.role;
  const adminName = req.admin.fullName;

  // Delete user profile
  const result = await deleteUserProfile(id);

  console.log(`🗑️ User deleted by ${adminRole} (${adminName}): ${result.deletedMember.email}`);

  successResponse(
    res,
    {
      deletedMember: result.deletedMember,
      deletedBy: {
        role: adminRole,
        name: adminName,
      },
    },
    result.message
  );
};

module.exports = {
  getPendingApprovalsController,
  getPendingApprovalsByRoleController,
  updateMemberApprovalController,
  deleteUserController,
};
