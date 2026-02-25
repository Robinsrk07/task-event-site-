const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Get members pending approval (at least one role needs to approve)
const getPendingApprovals = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    // Query: Find members where at least one approval is false
    const query = {
      $or: [
        { 'approvals.president.approved': false },
        { 'approvals.secretary.approved': false },
        { 'approvals.treasurer.approved': false },
      ],
    };

    // Get members with pagination (ALL FIELDS for admin review)
    const members = await User.find(query)
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit)
      .select('-password') // Exclude password only
      .lean();

    // Get total count
    const totalMembers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalMembers / limit);

    // Format members data - Return ALL fields for admin review
    const formattedMembers = members.map((member) => ({
      id: member._id.toString(),
      membershipNumber: member.membershipNumber || 'N/A',
      membershipType: member.membershipType,
      
      // Basic Info (for list view)
      name: member.member?.fullName || 'N/A',
      company: member.establishment?.name || 'N/A',
      email: member.email || 'N/A',
      phone: member.member?.mobile || 'N/A',
      
      // Complete Establishment Details
      establishment: {
        name: member.establishment?.name || null,
        tradeName: member.establishment?.tradeName || null,
        yearOfEstablishment: member.establishment?.yearOfEstablishment || null,
        officialClassification: member.establishment?.officialClassification || null,
        businessType: member.establishment?.businessType || null,
        organizationalStatus: member.establishment?.organizationalStatus || null,
        officialEmail: member.establishment?.officialEmail || null,
        gstRegistered: member.establishment?.gstRegistered || false,
      },
      
      // Complete Location Details
      location: {
        district: member.location?.district || null,
        region: member.location?.region || null,
        city: member.location?.city || null,
        pinCode: member.location?.pinCode || null,
        registeredAddress: member.location?.registeredAddress || null,
        communicationAddress: member.location?.communicationAddress || null,
        isSameAddress: member.location?.isSameAddress || false,
      },
      
      // Complete Member Details
      member: {
        officeType: member.member?.officeType || null,
        roleInAgency: member.member?.roleInAgency || null,
        fullName: member.member?.fullName || null,
        dateOfBirth: member.member?.dateOfBirth || null,
        mobile: member.member?.mobile || null,
        landline: member.member?.landline || null,
      },
      
      // Partner Details
      partner: {
        name: member.partner?.name || null,
        mobile: member.partner?.mobile || null,
      },
      
      // Staff Details
      staff: {
        name: member.staff?.name || null,
        mobile: member.staff?.mobile || null,
      },
      
      // Documents
      documents: {
        agencyAddressProof: member.documents?.agencyAddressProof || null,
        shopPhoto: member.documents?.shopPhoto || null,
        businessCard: member.documents?.businessCard || null,
      },
      
      // Status & Rejection
      status: member.status || 'submitted',
      rejectionReason: member.rejectionReason || null,
      
      // Approvals (Complete with dates and remarks)
      approvals: {
        president: {
          approved: member.approvals?.president?.approved || false,
          approvedAt: member.approvals?.president?.approvedAt || null,
          remarks: member.approvals?.president?.remarks || null,
        },
        secretary: {
          approved: member.approvals?.secretary?.approved || false,
          approvedAt: member.approvals?.secretary?.approvedAt || null,
          remarks: member.approvals?.secretary?.remarks || null,
        },
        treasurer: {
          approved: member.approvals?.treasurer?.approved || false,
          approvedAt: member.approvals?.treasurer?.approvedAt || null,
          remarks: member.approvals?.treasurer?.remarks || null,
        },
      },
      
      // Payment Information
      payment: {
        status: member.payment?.status || 'pending',
        amount: member.payment?.amount || null,
        transactionId: member.payment?.transactionId || null,
        paymentDate: member.payment?.paymentDate || null,
        paymentMethod: member.payment?.paymentMethod || null,
      },
      
      // Referral Information
      referral: {
        referredBy: member.referral?.referredBy || null,
        referralCode: member.referral?.referralCode || null,
        referredMembers: member.referral?.referredMembers || [],
      },
      
      // Certificate Information
      certificate: {
        generated: member.certificate?.generated || false,
        certificateNumber: member.certificate?.certificateNumber || null,
        issueDate: member.certificate?.issueDate || null,
        expiryDate: member.certificate?.expiryDate || null,
        url: member.certificate?.url || null,
        publicId: member.certificate?.publicId || null,
      },
      
      // Verification Flags
      isEmailVerified: member.isEmailVerified || false,
      isMobileVerified: member.isMobileVerified || false,
      
      // Profile Change Request
      profileChangeRequest: {
        pending: member.profileChangeRequest?.pending || false,
        requestedChanges: member.profileChangeRequest?.requestedChanges || null,
        requestedAt: member.profileChangeRequest?.requestedAt || null,
      },
      
      // Activity Info
      lastLogin: member.lastLogin || null,
      isActive: member.isActive,
      registrationDate: member.createdAt,
      updatedAt: member.updatedAt,
    }));

    // Pagination info
    const pagination = {
      currentPage: page,
      totalPages,
      totalMembers,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      members: formattedMembers,
      pagination,
    };
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    throw new ApiError(500, 'Failed to retrieve pending approvals');
  }
};

// Get members pending approval for specific role
const getPendingApprovalsByRole = async (role, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    // Validate role
    const validRoles = ['president', 'secretary', 'treasurer'];
    if (!validRoles.includes(role)) {
      throw new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Query: Find members where specific role approval is false
    const query = {
      [`approvals.${role}.approved`]: false,
    };

    // Get members with pagination (ALL FIELDS for admin review)
    const members = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password') // Exclude password only
      .lean();

    // Get total count
    const totalMembers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalMembers / limit);

    // Format members data - Return ALL fields for admin review
    const formattedMembers = members.map((member) => ({
      id: member._id.toString(),
      membershipNumber: member.membershipNumber || 'N/A',
      membershipType: member.membershipType,
      
      // Basic Info (for list view)
      name: member.member?.fullName || 'N/A',
      company: member.establishment?.name || 'N/A',
      email: member.email || 'N/A',
      phone: member.member?.mobile || 'N/A',
      
      // Complete Establishment Details
      establishment: {
        name: member.establishment?.name || null,
        tradeName: member.establishment?.tradeName || null,
        yearOfEstablishment: member.establishment?.yearOfEstablishment || null,
        officialClassification: member.establishment?.officialClassification || null,
        businessType: member.establishment?.businessType || null,
        organizationalStatus: member.establishment?.organizationalStatus || null,
        officialEmail: member.establishment?.officialEmail || null,
        gstRegistered: member.establishment?.gstRegistered || false,
      },
      
      // Complete Location Details
      location: {
        district: member.location?.district || null,
        region: member.location?.region || null,
        city: member.location?.city || null,
        pinCode: member.location?.pinCode || null,
        registeredAddress: member.location?.registeredAddress || null,
        communicationAddress: member.location?.communicationAddress || null,
        isSameAddress: member.location?.isSameAddress || false,
      },
      
      // Complete Member Details
      member: {
        officeType: member.member?.officeType || null,
        roleInAgency: member.member?.roleInAgency || null,
        fullName: member.member?.fullName || null,
        dateOfBirth: member.member?.dateOfBirth || null,
        mobile: member.member?.mobile || null,
        landline: member.member?.landline || null,
      },
      
      // Partner Details
      partner: {
        name: member.partner?.name || null,
        mobile: member.partner?.mobile || null,
      },
      
      // Staff Details
      staff: {
        name: member.staff?.name || null,
        mobile: member.staff?.mobile || null,
      },
      
      // Documents
      documents: {
        agencyAddressProof: member.documents?.agencyAddressProof || null,
        shopPhoto: member.documents?.shopPhoto || null,
        businessCard: member.documents?.businessCard || null,
      },
      
      // Status & Rejection
      status: member.status || 'submitted',
      rejectionReason: member.rejectionReason || null,
      
      // Approvals (Complete with dates and remarks)
      approvals: {
        president: {
          approved: member.approvals?.president?.approved || false,
          approvedAt: member.approvals?.president?.approvedAt || null,
          remarks: member.approvals?.president?.remarks || null,
        },
        secretary: {
          approved: member.approvals?.secretary?.approved || false,
          approvedAt: member.approvals?.secretary?.approvedAt || null,
          remarks: member.approvals?.secretary?.remarks || null,
        },
        treasurer: {
          approved: member.approvals?.treasurer?.approved || false,
          approvedAt: member.approvals?.treasurer?.approvedAt || null,
          remarks: member.approvals?.treasurer?.remarks || null,
        },
      },
      
      // Payment Information
      payment: {
        status: member.payment?.status || 'pending',
        amount: member.payment?.amount || null,
        transactionId: member.payment?.transactionId || null,
        paymentDate: member.payment?.paymentDate || null,
        paymentMethod: member.payment?.paymentMethod || null,
      },
      
      // Referral Information
      referral: {
        referredBy: member.referral?.referredBy || null,
        referralCode: member.referral?.referralCode || null,
        referredMembers: member.referral?.referredMembers || [],
      },
      
      // Certificate Information
      certificate: {
        generated: member.certificate?.generated || false,
        certificateNumber: member.certificate?.certificateNumber || null,
        issueDate: member.certificate?.issueDate || null,
        expiryDate: member.certificate?.expiryDate || null,
        url: member.certificate?.url || null,
        publicId: member.certificate?.publicId || null,
      },
      
      // Verification Flags
      isEmailVerified: member.isEmailVerified || false,
      isMobileVerified: member.isMobileVerified || false,
      
      // Profile Change Request
      profileChangeRequest: {
        pending: member.profileChangeRequest?.pending || false,
        requestedChanges: member.profileChangeRequest?.requestedChanges || null,
        requestedAt: member.profileChangeRequest?.requestedAt || null,
      },
      
      // Activity Info
      lastLogin: member.lastLogin || null,
      isActive: member.isActive,
      registrationDate: member.createdAt,
      updatedAt: member.updatedAt,
    }));

    // Pagination info
    const pagination = {
      currentPage: page,
      totalPages,
      totalMembers,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      members: formattedMembers,
      pagination,
    };
  } catch (error) {
    console.error('Error getting pending approvals by role:', error);
    throw error;
  }
};

// Update member approval (approve/reject)
const updateMemberApproval = async (memberId, adminRole, action, remarks) => {
  try {
    // Validate role
    const validRoles = ['president', 'secretary', 'treasurer'];
    if (!validRoles.includes(adminRole)) {
      throw new ApiError(400, 'Invalid admin role');
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      throw new ApiError(400, 'Action must be either "approve" or "reject"');
    }

    // Find member
    const member = await User.findById(memberId);
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // Update the specific role's approval
    const currentTimestamp = new Date();

    if (action === 'approve') {
      // Approve
      member.approvals[adminRole].approved = true;
      member.approvals[adminRole].approvedAt = currentTimestamp;
      member.approvals[adminRole].remarks = remarks || null;

      // Check if all 3 roles have approved
      const allApproved =
        member.approvals.president.approved &&
        member.approvals.secretary.approved &&
        member.approvals.treasurer.approved;

      if (allApproved) {
        member.status = 'approved';
        console.log(`✅ All approvals complete for member: ${member.member.fullName}`);
      }
    } else {
      // Reject
      member.approvals[adminRole].approved = false;
      member.approvals[adminRole].approvedAt = currentTimestamp;
      member.approvals[adminRole].remarks = remarks || null;

      // Set rejection reason at top level
      if (remarks) {
        member.rejectionReason = remarks;
      }
    }

    // Save changes
    await member.save();

    return {
      message: action === 'approve' ? 'Member approved successfully' : 'Member rejected successfully',
      memberId: member._id,
      memberName: member.member?.fullName,
      updatedApproval: {
        role: adminRole,
        approved: member.approvals[adminRole].approved,
        approvedAt: member.approvals[adminRole].approvedAt,
        remarks: member.approvals[adminRole].remarks,
      },
      allApproved:
        member.approvals.president.approved &&
        member.approvals.secretary.approved &&
        member.approvals.treasurer.approved,
      status: member.status,
    };
  } catch (error) {
    console.error('Error updating member approval:', error);
    throw error;
  }
};

// Delete user profile entirely
const deleteUserProfile = async (memberId) => {
  try {
    // Find and delete member
    const member = await User.findByIdAndDelete(memberId);

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    return {
      message: 'Member profile deleted successfully',
      deletedMember: {
        id: member._id,
        name: member.member?.fullName || 'N/A',
        email: member.email,
        membershipNumber: member.membershipNumber || null,
        deletedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
};

module.exports = {
  getPendingApprovals,
  getPendingApprovalsByRole,
  updateMemberApproval,
  deleteUserProfile,
};
