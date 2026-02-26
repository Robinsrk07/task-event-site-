const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const ApiError = require('../utils/ApiError');

// Helper: Get changed fields comparison
const getChangedFields = (current, requested) => {
  const changes = [];
  const flattenObject = (obj, prefix = '') => {
    const result = {};
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        Object.assign(result, flattenObject(obj[key], `${prefix}${key}.`));
      } else {
        result[`${prefix}${key}`] = obj[key];
      }
    }
    return result;
  };

  const flatCurrent = flattenObject(current);
  const flatRequested = flattenObject(requested);

  for (const key in flatRequested) {
    if (JSON.stringify(flatCurrent[key]) !== JSON.stringify(flatRequested[key])) {
      changes.push({
        field: key,
        currentValue: flatCurrent[key],
        requestedValue: flatRequested[key],
      });
    }
  }

  return changes;
};

// 1. Request Profile Update
const requestProfileUpdate = async (memberId, requestedChanges) => {
  try {
    // Find member
    const member = await User.findById(memberId);
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // Check if already has pending request
    if (member.profileChangeRequest.pending && member.profileChangeRequest.status === 'pending') {
      const pendingFor = Math.floor((new Date() - member.profileChangeRequest.requestedAt) / (1000 * 60 * 60));
      throw new ApiError(400, `You already have a pending profile update request. Please wait for admin review or cancel the existing request. (Pending for ${pendingFor} hours)`);
    }

    // Validate that there are actual changes
    if (!requestedChanges || Object.keys(requestedChanges).length === 0) {
      throw new ApiError(400, 'No changes provided. Please provide fields to update.');
    }

    // Get current profile for comparison
    const currentProfile = {
      member: member.member,
      location: member.location,
      establishment: member.establishment,
      partner: member.partner,
      staff: member.staff,
    };

    // Get changed fields
    const changedFields = getChangedFields(currentProfile, requestedChanges);

    if (changedFields.length === 0) {
      throw new ApiError(400, 'No actual changes detected. The provided values match your current profile.');
    }

    // Store change request
    member.profileChangeRequest = {
      pending: true,
      requestedChanges,
      requestedAt: new Date(),
      status: 'pending',
      reviewedBy: {},
      reviewedAt: null,
      rejectionReason: null,
      remarks: requestedChanges.remarks || null,
    };

    await member.save();

    // Send email notification to member
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .changes { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Profile Update Request Submitted</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${member.member?.fullName || 'Member'}</strong>,</p>
            <p>Your profile update request has been submitted successfully and is now pending admin review.</p>
            
            <div class="changes">
              <h3>Changes Requested:</h3>
              <p><strong>${changedFields.length}</strong> field(s) will be updated after admin approval.</p>
            </div>

            <p><strong>Status:</strong> Pending Admin Review</p>
            <p><strong>Estimated Review Time:</strong> 24-48 hours</p>
            <p>You will be notified once your request is reviewed.</p>
          </div>
          <div class="footer">
            <p>© 2024 TechFinit. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: member.email,
      subject: 'Profile Update Request Submitted - TechFinit',
      html: emailContent,
    });

    console.log(`✅ Profile update request submitted for member: ${member.email}`);

    return {
      message: 'Profile update request submitted successfully. Waiting for admin approval.',
      requestId: member._id,
      status: 'pending',
      requestedAt: member.profileChangeRequest.requestedAt,
      totalChanges: changedFields.length,
      changedFields: changedFields.map(f => f.field),
      estimatedReviewTime: '24-48 hours',
    };
  } catch (error) {
    console.error('Error submitting profile update request:', error);
    throw error;
  }
};

// 2. Get Profile Change Request Status
const getChangeRequestStatus = async (memberId) => {
  try {
    const member = await User.findById(memberId).lean();
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    const request = member.profileChangeRequest;

    // No request at all
    if (!request || !request.requestedAt) {
      return {
        hasPendingRequest: false,
        lastRequest: null,
        message: 'No pending or recent profile change requests',
      };
    }

    // Pending request
    if (request.pending && request.status === 'pending') {
      const pendingFor = Math.floor((new Date() - new Date(request.requestedAt)) / (1000 * 60));
      const hours = Math.floor(pendingFor / 60);
      const minutes = pendingFor % 60;

      // Get changed fields for display
      const changedFields = [];
      if (request.requestedChanges) {
        const flattenObject = (obj, prefix = '') => {
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
              flattenObject(obj[key], `${prefix}${key}.`);
            } else {
              changedFields.push(`${prefix}${key}`);
            }
          }
        };
        flattenObject(request.requestedChanges);
      }

      return {
        hasPendingRequest: true,
        message: 'You have a pending profile update request',
        request: {
          status: 'pending',
          requestedAt: request.requestedAt,
          pendingFor: `${hours} hours ${minutes} minutes`,
          requestedChanges: request.requestedChanges,
          changedFields,
          totalChanges: changedFields.length,
          remarks: request.remarks,
        },
      };
    }

    // Approved request
    if (request.status === 'approved') {
      return {
        hasPendingRequest: false,
        message: 'Your last profile update request was approved',
        lastRequest: {
          status: 'approved',
          requestedAt: request.requestedAt,
          approvedAt: request.reviewedAt,
          approvedBy: {
            role: request.reviewedBy?.adminRole,
            name: request.reviewedBy?.adminName,
          },
          changesApplied: true,
          remarks: request.remarks,
        },
      };
    }

    // Rejected request
    if (request.status === 'rejected') {
      return {
        hasPendingRequest: false,
        message: 'Your last profile update request was rejected',
        lastRequest: {
          status: 'rejected',
          requestedAt: request.requestedAt,
          rejectedAt: request.reviewedAt,
          rejectedBy: {
            role: request.reviewedBy?.adminRole,
            name: request.reviewedBy?.adminName,
          },
          rejectionReason: request.rejectionReason,
          canResubmit: true,
        },
      };
    }

    return {
      hasPendingRequest: false,
      lastRequest: null,
      message: 'No recent profile change requests',
    };
  } catch (error) {
    console.error('Error getting change request status:', error);
    throw error;
  }
};

// 3. Cancel Pending Request
const cancelChangeRequest = async (memberId) => {
  try {
    const member = await User.findById(memberId);
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    const request = member.profileChangeRequest;

    // Check if there's a pending request
    if (!request || !request.pending || request.status !== 'pending') {
      throw new ApiError(400, 'No pending profile update request found to cancel');
    }

    // Check if already reviewed
    if (request.reviewedAt) {
      throw new ApiError(400, `Cannot cancel request. It has already been reviewed by ${request.reviewedBy?.adminRole || 'admin'}.`);
    }

    // Clear the request
    member.profileChangeRequest = {
      pending: false,
      requestedChanges: null,
      requestedAt: null,
      status: 'pending',
      reviewedBy: {},
      reviewedAt: null,
      rejectionReason: null,
      remarks: null,
    };

    await member.save();

    console.log(`✅ Profile change request cancelled by member: ${member.email}`);

    return {
      message: 'Profile update request cancelled successfully',
      cancelledAt: new Date(),
      canSubmitNewRequest: true,
    };
  } catch (error) {
    console.error('Error cancelling change request:', error);
    throw error;
  }
};

module.exports = {
  requestProfileUpdate,
  getChangeRequestStatus,
  cancelChangeRequest,
};
