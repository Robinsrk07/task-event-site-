const User = require('../models/User');
const Admin = require('../models/Admin');
const { sendEmail } = require('../utils/emailService');
const ApiError = require('../utils/ApiError');

// Helper: Get comparison object
const getComparison = (current, requested) => {
  const comparison = {};
  
  const processObject = (currentObj, requestedObj, prefix = '') => {
    for (const key in requestedObj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (requestedObj[key] && typeof requestedObj[key] === 'object' && !Array.isArray(requestedObj[key]) && !(requestedObj[key] instanceof Date)) {
        // Nested object
        if (!comparison[prefix || key]) {
          comparison[prefix || key] = {};
        }
        processObject(currentObj?.[key] || {}, requestedObj[key], key);
      } else {
        // Direct value
        const currentValue = currentObj?.[key];
        const requestedValue = requestedObj[key];
        const changed = JSON.stringify(currentValue) !== JSON.stringify(requestedValue);
        
        if (!comparison[prefix]) {
          comparison[prefix] = {};
        }
        
        comparison[prefix][key] = {
          current: currentValue,
          requested: requestedValue,
          changed,
        };
      }
    }
  };
  
  processObject(current, requested);
  return comparison;
};

// 1. Get All Profile Change Requests
const getAllProfileChangeRequests = async (filters = {}, pagination = {}) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = { ...filters, ...pagination };
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (status === 'pending') {
      query['profileChangeRequest.pending'] = true;
      query['profileChangeRequest.status'] = 'pending';
    } else if (status === 'approved' || status === 'rejected') {
      query['profileChangeRequest.status'] = status;
    }

    // Get total count
    const totalRequests = await User.countDocuments(query);

    // Get requests with pagination
    const requests = await User.find(query)
      .select('_id email member.fullName member.mobile establishment.name membershipNumber status profileChangeRequest')
      .sort({ 'profileChangeRequest.requestedAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response
    const formattedRequests = requests.map(user => {
      const pendingFor = user.profileChangeRequest?.requestedAt
        ? Math.floor((new Date() - new Date(user.profileChangeRequest.requestedAt)) / (1000 * 60))
        : 0;
      
      const hours = Math.floor(pendingFor / 60);
      const minutes = pendingFor % 60;

      // Count changed fields
      let totalChanges = 0;
      const changedFields = [];
      
      if (user.profileChangeRequest?.requestedChanges) {
        const flattenObject = (obj, prefix = '') => {
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
              flattenObject(obj[key], `${prefix}${key}.`);
            } else if (key !== 'remarks') {
              changedFields.push(`${prefix}${key}`);
              totalChanges++;
            }
          }
        };
        flattenObject(user.profileChangeRequest.requestedChanges);
      }

      return {
        userId: user._id,
        memberDetails: {
          fullName: user.member?.fullName || 'N/A',
          email: user.email,
          mobile: user.member?.mobile || 'N/A',
          establishmentName: user.establishment?.name || 'N/A',
          membershipNumber: user.membershipNumber || 'N/A',
          status: user.status,
        },
        changeRequest: {
          status: user.profileChangeRequest?.status || 'pending',
          requestedAt: user.profileChangeRequest?.requestedAt,
          pendingFor: `${hours} hours ${minutes} minutes`,
          totalChanges,
          changedFields,
          remarks: user.profileChangeRequest?.remarks,
        },
      };
    });

    // Calculate summary
    const totalPending = await User.countDocuments({
      'profileChangeRequest.pending': true,
      'profileChangeRequest.status': 'pending',
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pendingToday = await User.countDocuments({
      'profileChangeRequest.pending': true,
      'profileChangeRequest.status': 'pending',
      'profileChangeRequest.requestedAt': { $gte: today },
    });

    return {
      requests: formattedRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        limit,
        hasNextPage: page * limit < totalRequests,
        hasPrevPage: page > 1,
      },
      summary: {
        totalPending,
        pendingToday,
        avgReviewTime: '18 hours', // Can calculate from historical data
      },
    };
  } catch (error) {
    console.error('Error getting profile change requests:', error);
    throw error;
  }
};

// 2. Get Detailed Profile Change Request
const getProfileChangeRequestDetails = async (userId) => {
  try {
    const user = await User.findById(userId).lean();
    
    if (!user) {
      throw new ApiError(404, 'Member not found');
    }

    const request = user.profileChangeRequest;
    
    if (!request || !request.requestedAt) {
      throw new ApiError(404, 'No profile change request found for this member');
    }

    // Calculate pending time
    const pendingFor = Math.floor((new Date() - new Date(request.requestedAt)) / (1000 * 60));
    const hours = Math.floor(pendingFor / 60);
    const minutes = pendingFor % 60;

    // Get current profile
    const currentProfile = {
      member: user.member,
      location: user.location,
      establishment: user.establishment,
      partner: user.partner,
      staff: user.staff,
    };

    // Get comparison
    const comparison = getComparison(currentProfile, request.requestedChanges || {});

    // Get changed and unchanged fields
    const changedFields = [];
    const unchangedFields = [];

    const processComparison = (obj, prefix = '') => {
      for (const key in obj) {
        if (obj[key].changed !== undefined) {
          const fieldName = `${prefix}${key}`;
          if (obj[key].changed) {
            changedFields.push(fieldName);
          } else {
            unchangedFields.push(fieldName);
          }
        } else if (typeof obj[key] === 'object') {
          processComparison(obj[key], `${prefix}${key}.`);
        }
      }
    };

    processComparison(comparison);

    return {
      member: {
        id: user._id,
        fullName: user.member?.fullName || 'N/A',
        email: user.email,
        membershipNumber: user.membershipNumber || 'N/A',
        status: user.status,
        registeredOn: user.createdAt,
      },
      changeRequest: {
        status: request.status,
        requestedAt: request.requestedAt,
        pendingFor: `${hours} hours ${minutes} minutes`,
        remarks: request.remarks,
        reviewedAt: request.reviewedAt,
        reviewedBy: request.reviewedBy,
      },
      comparison,
      summary: {
        totalChanges: changedFields.length,
        changedFields,
        unchangedFields,
      },
    };
  } catch (error) {
    console.error('Error getting profile change request details:', error);
    throw error;
  }
};

// 3. Review Profile Change Request (Approve/Reject)
const reviewProfileChangeRequest = async (userId, adminId, action, remarks) => {
  try {
    // Find member
    const member = await User.findById(userId);
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    const request = member.profileChangeRequest;

    // Check if there's a pending request
    if (!request || !request.pending || request.status !== 'pending') {
      throw new ApiError(400, 'No pending profile change request found for this member');
    }

    // Process based on action
    if (action === 'approve') {
      // Apply changes to profile
      const changes = request.requestedChanges;
      
      if (changes.member) {
        Object.assign(member.member, changes.member);
      }
      if (changes.location) {
        Object.assign(member.location, changes.location);
      }
      if (changes.establishment) {
        Object.assign(member.establishment, changes.establishment);
      }
      if (changes.partner) {
        Object.assign(member.partner, changes.partner);
      }
      if (changes.staff) {
        Object.assign(member.staff, changes.staff);
      }

      // Update request status
      member.profileChangeRequest = {
        pending: false,
        requestedChanges: request.requestedChanges,
        requestedAt: request.requestedAt,
        status: 'approved',
        reviewedBy: {
          adminId: admin._id,
          adminRole: admin.role,
          adminName: admin.fullName,
        },
        reviewedAt: new Date(),
        rejectionReason: null,
        remarks: remarks || 'Approved',
      };

      await member.save();

      // Count applied changes
      let totalChangesApplied = 0;
      const changesApplied = {};
      
      const countChanges = (obj, prefix = '') => {
        for (const key in obj) {
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
            countChanges(obj[key], `${prefix}${key}.`);
          } else {
            changesApplied[`${prefix}${key}`] = obj[key];
            totalChangesApplied++;
          }
        }
      };
      
      countChanges(changes);

      // Send approval email to member
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #4CAF50; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Profile Updated Successfully</h1>
            </div>
            <div class="content">
              <div class="success">
                <h2 style="margin: 0;">🎉 Your Profile Update Request Has Been Approved</h2>
              </div>
              <p>Hi <strong>${member.member?.fullName || 'Member'}</strong>,</p>
              <p>Good news! Your profile update request has been approved by <strong>${admin.role}</strong>.</p>
              <p><strong>Total Changes Applied:</strong> ${totalChangesApplied} field(s)</p>
              <p><strong>Approved By:</strong> ${admin.fullName} (${admin.role})</p>
              <p><strong>Approved At:</strong> ${new Date().toLocaleString()}</p>
              ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
              <p>Your profile has been updated successfully. You can view your updated profile now.</p>
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
        subject: '✅ Profile Updated Successfully - TechFinit',
        html: emailContent,
      });

      console.log(`✅ Profile update approved for member: ${member.email} by ${admin.role}`);

      return {
        message: 'Profile update request approved successfully. Member profile has been updated.',
        userId: member._id,
        memberName: member.member?.fullName,
        memberEmail: member.email,
        action: 'approved',
        approvedBy: {
          adminId: admin._id,
          adminName: admin.fullName,
          adminRole: admin.role,
        },
        approvedAt: new Date(),
        remarks: remarks || 'Approved',
        changesApplied,
        totalChangesApplied,
        emailNotification: 'Sent to member',
        profileUpdated: true,
      };
    } else if (action === 'reject') {
      // Reject the request
      if (!remarks) {
        throw new ApiError(400, 'Rejection reason is required when rejecting a request');
      }

      member.profileChangeRequest = {
        pending: false,
        requestedChanges: request.requestedChanges,
        requestedAt: request.requestedAt,
        status: 'rejected',
        reviewedBy: {
          adminId: admin._id,
          adminRole: admin.role,
          adminName: admin.fullName,
        },
        reviewedAt: new Date(),
        rejectionReason: remarks,
        remarks: remarks,
      };

      await member.save();

      // Send rejection email to member
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reject { background: #e74c3c; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .reason { background: white; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Profile Update Request Rejected</h1>
            </div>
            <div class="content">
              <div class="reject">
                <h2 style="margin: 0;">Your Profile Update Request Has Been Rejected</h2>
              </div>
              <p>Hi <strong>${member.member?.fullName || 'Member'}</strong>,</p>
              <p>Your profile update request has been reviewed and rejected by <strong>${admin.role}</strong>.</p>
              
              <div class="reason">
                <h3>Rejection Reason:</h3>
                <p>${remarks}</p>
              </div>

              <p><strong>Reviewed By:</strong> ${admin.fullName} (${admin.role})</p>
              <p><strong>Reviewed At:</strong> ${new Date().toLocaleString()}</p>
              
              <p>You can submit a new profile update request with the correct information and required documents.</p>
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
        subject: '❌ Profile Update Request Rejected - TechFinit',
        html: emailContent,
      });

      console.log(`❌ Profile update rejected for member: ${member.email} by ${admin.role}`);

      return {
        message: 'Profile update request rejected. Member has been notified with rejection reason.',
        userId: member._id,
        memberName: member.member?.fullName,
        memberEmail: member.email,
        action: 'rejected',
        rejectedBy: {
          adminId: admin._id,
          adminName: admin.fullName,
          adminRole: admin.role,
        },
        rejectedAt: new Date(),
        rejectionReason: remarks,
        emailNotification: 'Sent to member',
        profileUnchanged: true,
        memberCanResubmit: true,
      };
    } else {
      throw new ApiError(400, 'Invalid action. Must be either "approve" or "reject"');
    }
  } catch (error) {
    console.error('Error reviewing profile change request:', error);
    throw error;
  }
};

module.exports = {
  getAllProfileChangeRequests,
  getProfileChangeRequestDetails,
  reviewProfileChangeRequest,
};
