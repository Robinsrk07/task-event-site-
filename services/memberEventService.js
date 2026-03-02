const Event = require('../models/Event');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { createOrder, verifyPaymentSignature } = require('../utils/razorpayHelper');

/**
 * Register a member for an event
 * @param {string} eventId - ID of the event
 * @param {string} memberId - ID of the member
 * @param {Object} memberInfo - Additional member info (optional)
 * @returns {Promise<Object>} - Registration result or payment order
 */
const registerForEvent = async (eventId, memberId, memberInfo = {}) => {
    try {
        // 1. Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, 'Event not found');
        }

        // 2. Check if member is approved
        const member = await User.findById(memberId);
        if (!member || member.status !== 'approved') {
            throw new ApiError(403, 'Your membership is not yet approved. Only approved members can register for events.');
        }

        // 3. Validate event status and registration window
        if (event.status !== 'published') {
            throw new ApiError(400, 'This event is not yet open for registration');
        }

        if (!event.registration.isOpen) {
            throw new ApiError(400, 'Registration for this event is closed');
        }

        const now = new Date();
        if (now > event.registration.deadline) {
            throw new ApiError(400, 'Registration deadline has passed');
        }

        // 3. Check capacity
        if (event.registration.currentCount >= event.registration.maxCapacity) {
            throw new ApiError(400, 'Event has reached its maximum capacity');
        }

        // 4. Check if member is already registered
        const isAlreadyRegistered = event.registrations.some(
            (reg) => reg.member.toString() === memberId.toString()
        );

        if (isAlreadyRegistered) {
            throw new ApiError(400, 'You are already registered for this event');
        }

        // 5. Handle Free Event vs Paid Event
        if (event.registration.isFree) {
            // FREE EVENT REGISTRATION
            event.registrations.push({
                member: memberId,
                registeredAt: new Date(),
                payment: {
                    status: 'completed',
                    amount: 0,
                    paymentMethod: 'other', // Or 'none'
                    paidAt: new Date(),
                },
            });

            event.registration.currentCount += 1;
            await event.save();

            console.log(`✅ Member ${memberId} registered for Free Event: ${event.title}`);

            return {
                success: true,
                isFree: true,
                message: 'Registration successful!',
                event: {
                    id: event._id,
                    title: event.title,
                },
            };
        } else {
            // PAID EVENT REGISTRATION - Initiate Payment Flow

            // Calculate amount (handle early bird)
            let amount = event.registration.fee;
            const isEarlyBird = event.registration.earlyBirdDeadline && now <= event.registration.earlyBirdDeadline;

            if (isEarlyBird && event.registration.earlyBirdFee !== undefined) {
                amount = event.registration.earlyBirdFee;
            }

            // Create Razorpay order
            const receipt = `EVT_REG_${eventId}_${memberId}_${Date.now()}`;
            const notes = {
                eventId: eventId.toString(),
                memberId: memberId.toString(),
                eventTitle: event.title,
                type: 'event_registration'
            };

            const order = await createOrder(amount, receipt, notes);

            // Add pending registration entry
            event.registrations.push({
                member: memberId,
                payment: {
                    status: 'pending',
                    amount: amount,
                    transactionId: order.id, // Store order ID as temporary transaction ID
                },
            });

            // We don't increment currentCount yet for paid events until payment is verified
            await event.save();

            console.log(`💳 Payment order created for Event Registration: ${event.title} (Amount: ${amount})`);

            return {
                success: true,
                isFree: false,
                message: 'Payment required to complete registration',
                order: {
                    id: order.id,
                    amount: amount,
                    currency: 'INR',
                    key: process.env.RAZORPAY_KEY_ID,
                },
                event: {
                    id: event._id,
                    title: event.title,
                },
            };
        }
    } catch (error) {
        console.error('Error in registerForEvent:', error);
        throw error;
    }
};

/**
 * Verify event registration payment
 * @param {string} razorpayOrderId 
 * @param {string} razorpayPaymentId 
 * @param {string} razorpaySignature 
 */
const verifyRegistrationPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    try {
        // 1. Verify signature
        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            throw new ApiError(400, 'Payment verification failed. Invalid signature.');
        }

        // 2. Find event containing this order ID
        const event = await Event.findOne({ 'registrations.payment.transactionId': razorpayOrderId });
        if (!event) {
            throw new ApiError(404, 'Event registration order not found');
        }

        // 3. Find specific registration entry
        const registration = event.registrations.find(
            (reg) => reg.payment.transactionId === razorpayOrderId && reg.payment.status === 'pending'
        );

        if (!registration) {
            throw new ApiError(400, 'Registration already processed or not found');
        }

        // 4. Update registration details
        registration.payment.status = 'completed';
        registration.payment.transactionId = razorpayPaymentId; // Update with actual payment ID
        registration.payment.paidAt = new Date();
        registration.registeredAt = new Date();

        // 5. Increment event capacity count
        event.registration.currentCount += 1;

        // 6. Save event
        await event.save();

        console.log(`✅ Payment verified for Event: ${event.title}. Member: ${registration.member}`);

        return {
            success: true,
            message: 'Registration confirmed!',
            event: {
                id: event._id,
                title: event.title,
            }
        };
    } catch (error) {
        console.error('Error verifying registration payment:', error);
        throw error;
    }
};

/**
 * Get all events a member is registered for
 * @param {string} memberId 
 * @returns {Promise<Array>}
 */
const getMyRegisteredEvents = async (memberId) => {
    try {
        const events = await Event.find({
            'registrations.member': memberId,
            'registrations.payment.status': 'completed',
            isActive: true
        })
            .select('title eventType eventDate venue registration status registrations')
            .lean();

        // Transform and return only the relevant registration info for the member
        return events.map(event => {
            const myRegistration = event.registrations.find(
                reg => reg.member.toString() === memberId.toString()
            );

            return {
                id: event._id,
                title: event.title,
                eventType: event.eventType,
                eventDate: event.eventDate,
                venue: event.venue,
                status: event.status,
                registrationDetails: {
                    registeredAt: myRegistration.registeredAt,
                    paymentStatus: myRegistration.payment.status,
                    amount: myRegistration.payment.amount,
                    confirmationNumber: myRegistration.confirmationNumber
                }
            };
        });
    } catch (error) {
        console.error('Error in getMyRegisteredEvents:', error);
        throw error;
    }
};

module.exports = {
    registerForEvent,
    verifyRegistrationPayment,
    getMyRegisteredEvents,
};
