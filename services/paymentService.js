const User = require('../models/User');
const { calculateAmount, createOrder, verifyPaymentSignature, getRazorpayKeyId } = require('../utils/razorpayHelper');
const { sendEmail } = require('../utils/emailService');
const ApiError = require('../utils/ApiError');

// Helper: Generate unique certificate number
const generateCertificateNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CERT${year}${random}`;
};

// Helper: Calculate certificate expiry (1 year from issue date)
const calculateExpiryDate = (issueDate) => {
  const expiry = new Date(issueDate);
  expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry;
};

// 1. Create Payment Order
const createPaymentOrder = async (memberId) => {
  try {
    // Find member
    const member = await User.findById(memberId);
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // Check if member is eligible for payment
    if (member.status !== 'verified' && member.status !== 'approved') {
      throw new ApiError(400, 'Your application is not yet approved. Please wait for admin approval.');
    }

    // Determine payment type (new or renewal)
    let paymentType;
    let amounts;

    if (!member.certificate.generated) {
      // NEW MEMBER - First payment
      if (member.payment.status === 'completed') {
        throw new ApiError(400, 'Payment already completed. Certificate is being processed.');
      }
      paymentType = 'new';
      amounts = calculateAmount('new');
    } else {
      // EXISTING MEMBER - Renewal
      const today = new Date();
      const expiryDate = new Date(member.certificate.expiryDate);
      const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      // Check if renewal is needed
      if (daysRemaining > 30) {
        throw new ApiError(400, `Certificate is still valid for ${daysRemaining} days. Renewal available 30 days before expiry.`);
      }

      paymentType = 'renewal';
      amounts = calculateAmount('renewal');
    }

    // Create Razorpay order
    const receipt = `${paymentType.toUpperCase()}_${member.membershipNumber || member._id}_${Date.now()}`;
    const notes = {
      memberId: member._id.toString(),
      memberEmail: member.email,
      memberName: member.member?.fullName,
      paymentType,
    };

    const order = await createOrder(amounts.totalAmount, receipt, notes);

    // Store order details in database (for verification later)
    member.payment.razorpayOrderId = order.id;
    member.payment.amount = amounts.totalAmount;
    member.payment.baseAmount = amounts.baseAmount;
    member.payment.gstAmount = amounts.gstAmount;
    member.payment.type = paymentType;
    await member.save();

    console.log(`✅ Payment order created for member: ${member.email} (${paymentType})`);

    return {
      orderId: order.id,
      amount: amounts.totalAmount,
      amountBreakdown: {
        base: amounts.baseAmount,
        gst: amounts.gstAmount,
        gstPercent: amounts.gstPercent,
        total: amounts.totalAmount,
      },
      currency: 'INR',
      keyId: getRazorpayKeyId(),
      memberDetails: {
        name: member.member?.fullName,
        email: member.email,
        contact: member.member?.mobile,
      },
      paymentType,
      notes: {
        membershipNumber: member.membershipNumber,
        establishmentName: member.establishment?.name,
      },
    };
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

// 2. Verify Payment
const verifyPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    // Verify signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    
    if (!isValid) {
      console.error('❌ Invalid payment signature');
      throw new ApiError(400, 'Payment verification failed. Invalid signature.');
    }

    // Find member by order ID
    const member = await User.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
    
    if (!member) {
      throw new ApiError(404, 'Order not found. Please contact support.');
    }

    // Check if already processed
    if (member.payment.razorpayPaymentId === razorpayPaymentId) {
      console.log(`⚠️  Payment already processed for member: ${member.email}`);
      return {
        message: 'Payment already processed',
        alreadyProcessed: true,
        member: {
          id: member._id,
          email: member.email,
          status: member.status,
        },
      };
    }

    const paymentType = member.payment.type;
    const paymentAmount = member.payment.amount;

    // Update payment details
    member.payment.status = 'completed';
    member.payment.razorpayPaymentId = razorpayPaymentId;
    member.payment.razorpaySignature = razorpaySignature;
    member.payment.transactionId = razorpayPaymentId;
    member.payment.paymentDate = new Date();
    member.payment.paymentMethod = 'online';

    if (paymentType === 'new') {
      // NEW MEMBER - Generate certificate
      const issueDate = new Date();
      const expiryDate = calculateExpiryDate(issueDate);

      member.certificate.generated = true;
      member.certificate.certificateNumber = generateCertificateNumber();
      member.certificate.issueDate = issueDate;
      member.certificate.expiryDate = expiryDate;
      member.certificate.status = 'active';
      member.status = 'approved';

      await member.save();

      // Send payment success + certificate email
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
            .details { background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payment Successful!</h1>
            </div>
            <div class="content">
              <div class="success">
                <h2 style="margin: 0;">✅ Membership Activated</h2>
              </div>
              <p>Hi <strong>${member.member?.fullName || 'Member'}</strong>,</p>
              <p>Your payment has been successfully processed and your membership has been activated!</p>
              
              <div class="details">
                <h3>Payment Details:</h3>
                <p><strong>Amount Paid:</strong> ₹${paymentAmount}</p>
                <p><strong>Transaction ID:</strong> ${razorpayPaymentId}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <div class="details">
                <h3>Certificate Details:</h3>
                <p><strong>Certificate Number:</strong> ${member.certificate.certificateNumber}</p>
                <p><strong>Issue Date:</strong> ${issueDate.toLocaleDateString()}</p>
                <p><strong>Valid Until:</strong> ${expiryDate.toLocaleDateString()}</p>
              </div>

              <p>You can now access all member features and download your certificate from your profile.</p>
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
        subject: '🎉 Payment Successful - Membership Activated - TechFinit',
        html: emailContent,
      });

      console.log(`✅ Payment verified and certificate generated for NEW member: ${member.email}`);

      return {
        message: 'Payment successful! Your membership has been activated.',
        paymentType: 'new',
        paymentStatus: 'completed',
        amount: paymentAmount,
        transactionId: razorpayPaymentId,
        certificateGenerated: true,
        certificate: {
          certificateNumber: member.certificate.certificateNumber,
          issueDate,
          expiryDate,
          validFor: '1 year',
        },
        memberStatus: 'approved',
      };

    } else if (paymentType === 'renewal') {
      // RENEWAL - Extend certificate
      const previousExpiry = new Date(member.certificate.expiryDate);
      const newExpiry = calculateExpiryDate(previousExpiry);

      // Add to renewal history
      member.renewalHistory.push({
        renewalDate: new Date(),
        previousExpiryDate: previousExpiry,
        newExpiryDate: newExpiry,
        amount: paymentAmount,
        razorpayPaymentId,
        status: 'completed',
      });

      // Update certificate
      member.certificate.expiryDate = newExpiry;
      member.certificate.status = 'active';
      member.status = 'approved';

      await member.save();

      // Send renewal success email
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #2196F3; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .details { background: white; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Certificate Renewed Successfully!</h1>
            </div>
            <div class="content">
              <div class="success">
                <h2 style="margin: 0;">✅ Membership Renewed</h2>
              </div>
              <p>Hi <strong>${member.member?.fullName || 'Member'}</strong>,</p>
              <p>Your membership renewal payment has been successfully processed!</p>
              
              <div class="details">
                <h3>Payment Details:</h3>
                <p><strong>Amount Paid:</strong> ₹${paymentAmount}</p>
                <p><strong>Transaction ID:</strong> ${razorpayPaymentId}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <div class="details">
                <h3>Certificate Details:</h3>
                <p><strong>Certificate Number:</strong> ${member.certificate.certificateNumber}</p>
                <p><strong>Previous Expiry:</strong> ${previousExpiry.toLocaleDateString()}</p>
                <p><strong>New Expiry:</strong> ${newExpiry.toLocaleDateString()}</p>
                <p><strong>Extended By:</strong> 1 year</p>
              </div>

              <p>Your certificate has been extended for another year. You can download the updated certificate from your profile.</p>
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
        subject: '🔄 Certificate Renewed Successfully - TechFinit',
        html: emailContent,
      });

      console.log(`✅ Payment verified and certificate renewed for member: ${member.email}`);

      return {
        message: 'Payment successful! Your certificate has been renewed.',
        paymentType: 'renewal',
        paymentStatus: 'completed',
        amount: paymentAmount,
        transactionId: razorpayPaymentId,
        certificateRenewed: true,
        certificate: {
          certificateNumber: member.certificate.certificateNumber,
          previousExpiry,
          newExpiry,
          extendedBy: '1 year',
        },
        memberStatus: 'approved',
      };
    }

    throw new ApiError(400, 'Invalid payment type');

  } catch (error) {
    console.error('Error verifying payment:', error);
    
    // If payment verification fails, mark payment as failed
    if (razorpayOrderId) {
      const member = await User.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
      if (member) {
        member.payment.status = 'failed';
        await member.save();
      }
    }
    
    throw error;
  }
};

// 3. Get Payment Status (for UI to show correct button)
const getPaymentStatus = async (memberId) => {
  try {
    const member = await User.findById(memberId).lean();
    
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // NEW MEMBER - Not paid yet
    if (!member.certificate.generated) {
      const amounts = calculateAmount('new');
      
      return {
        memberType: 'new',
        paymentRequired: true,
        paymentType: 'registration',
        amount: amounts,
        certificateStatus: 'not_generated',
        buttonText: 'Pay Registration Fee',
        showButton: member.payment.status !== 'completed',
      };
    }

    // EXISTING MEMBER - Has certificate
    const today = new Date();
    const expiryDate = new Date(member.certificate.expiryDate);
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    // Active - More than 30 days remaining
    if (daysRemaining > 30) {
      return {
        memberType: 'existing',
        paymentRequired: false,
        certificateStatus: 'active',
        certificate: {
          certificateNumber: member.certificate.certificateNumber,
          issueDate: member.certificate.issueDate,
          expiryDate: member.certificate.expiryDate,
          daysRemaining,
        },
        buttonText: 'Download Certificate',
        showPaymentButton: false,
      };
    }

    // Expiring soon or expired - Show renewal option
    const amounts = calculateAmount('renewal');
    
    if (daysRemaining > 0) {
      // Expiring soon (1-30 days)
      return {
        memberType: 'existing',
        paymentRequired: false,
        renewalAvailable: true,
        paymentType: 'renewal',
        amount: amounts,
        certificateStatus: 'expiring_soon',
        certificate: {
          certificateNumber: member.certificate.certificateNumber,
          issueDate: member.certificate.issueDate,
          expiryDate: member.certificate.expiryDate,
          daysRemaining,
        },
        buttonText: 'Renew Now',
        showPaymentButton: true,
        alert: `Your certificate expires in ${daysRemaining} days`,
      };
    } else {
      // Expired
      return {
        memberType: 'existing',
        paymentRequired: true,
        paymentType: 'renewal',
        amount: amounts,
        certificateStatus: 'expired',
        certificate: {
          certificateNumber: member.certificate.certificateNumber,
          issueDate: member.certificate.issueDate,
          expiryDate: member.certificate.expiryDate,
          daysOverdue: Math.abs(daysRemaining),
        },
        buttonText: 'Renew Certificate',
        showPaymentButton: true,
        alert: `Your certificate expired ${Math.abs(daysRemaining)} days ago`,
      };
    }
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
};
