const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Get dashboard statistics
const getDashboardStats = async () => {
  try {
    // Get total members count
    const totalMembers = await User.countDocuments();

    // Get active members (status = 'active')
    const activeMembers = await User.countDocuments({
      status: 'active',
    });

    // Get pending members (status = 'submitted' or 'pending_approval')
    const pendingMembers = await User.countDocuments({
      status: { $in: ['submitted', 'pending_approval'] },
    });

    // Get rejected members (status = 'rejected')
    const rejectedMembers = await User.countDocuments({
      status: 'rejected',
    });

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      rejectedMembers,
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw new ApiError(500, 'Failed to retrieve dashboard statistics');
  }
};

// Get members list with pagination
const getMembersList = async (page = 1, limit = 10, status = 'submitted') => {
  try {
    const skip = (page - 1) * limit;

    const filter = status && status !== 'all' ? { status } : {};

    // Get members with pagination (sorted by latest first)
    const members = await User.find(filter)
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit)
      .select(
        'membershipNumber member.fullName establishment.name email member.mobile certificate.expiryDate status approvals createdAt'
      )
      .lean();

    // Get total count for pagination
    const totalMembers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalMembers / limit);

    // Format members data
    const formattedMembers = members.map((member) => ({
      id: member._id.toString(),
      membershipNumber: member.membershipNumber || 'N/A',
      name: member.member?.fullName || 'N/A',
      company: member.establishment?.name || 'N/A',
      email: member.email || 'N/A',
      phone: member.member?.mobile || 'N/A',
      certificateExpiry: member.certificate?.expiryDate || null,
      membershipStatus: member.status || 'submitted',
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
      registrationDate: member.createdAt,
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
    console.error('Error getting members list:', error);
    throw new ApiError(500, 'Failed to retrieve members list');
  }
};

// Get complete dashboard data
const getDashboardData = async (admin, page = 1, limit = 10, status = 'submitted') => {
  try {
    // Get statistics
    const stats = await getDashboardStats();

    // Get members list
    const { members, pagination } = await getMembersList(page, limit, status);

    // Format admin data
    const adminData = {
      id: admin._id.toString(),
      email: admin.email,
      fullName: admin.fullName,
      phone: admin.phone,
      role: admin.role,
      profilePic: admin.profilePic || {},
      isActive: admin.isActive,
      createdAt: admin.createdAt,
    };

    return {
      admin: adminData,
      stats,
      members,
      pagination,
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
};

module.exports = {
  getDashboardStats,
  getMembersList,
  getDashboardData,
};
