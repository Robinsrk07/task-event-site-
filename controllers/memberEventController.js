const { registerForEvent, verifyRegistrationPayment, getMyRegisteredEvents } = require('../services/memberEventService');
const { successResponse } = require('../utils/responseHelper');
const { getRazorpayKeyId } = require('../utils/razorpayHelper');

/**
 * Controller to handle event registration
 */
const registerForEventController = async (req, res) => {
    const { eventId } = req.params;
    const memberId = req.member.id;
    const memberInfo = req.body;

    const result = await registerForEvent(eventId, memberId, memberInfo);

    if (result.isFree) {
        return successResponse(
            res,
            result,
            'Event registration successful!',
            201
        );
    } else {
        // Return order details for frontend to initiate Razorpay checkout
        return successResponse(
            res,
            {
                ...result,
                razorpayKeyId: getRazorpayKeyId(),
                memberDetails: {
                    name: req.member.member?.fullName,
                    email: req.member.email,
                    contact: req.member.member?.mobile,
                }
            },
            'Payment order created. Please complete payment.',
            200
        );
    }
};

/**
 * Controller to handle payment verification
 */
const verifyEventRegistrationController = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const result = await verifyRegistrationPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    successResponse(
        res,
        result,
        'Payment verified and registration confirmed!'
    );
};

/**
 * Controller to get logged-in member's events
 */
const getMyEventsController = async (req, res) => {
    const memberId = req.member.id;

    const events = await getMyRegisteredEvents(memberId);

    successResponse(
        res,
        { events },
        'Your registered events retrieved successfully'
    );
};

module.exports = {
    registerForEventController,
    verifyEventRegistrationController,
    getMyEventsController,
};
