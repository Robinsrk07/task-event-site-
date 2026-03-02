const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');

// Create new event
const createEvent = async (eventData, adminId) => {
  try {
    // Validate dates
    const { startDate, endDate } = eventData.eventDate;
    const { deadline, earlyBirdDeadline } = eventData.registration;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const regDeadline = new Date(deadline);

    if (end < start) {
      throw new ApiError(400, 'Event end date must be after start date');
    }

    if (regDeadline >= start) {
      throw new ApiError(400, 'Registration deadline must be before event start date');
    }

    if (earlyBirdDeadline) {
      const earlyDeadline = new Date(earlyBirdDeadline);
      if (earlyDeadline >= regDeadline) {
        throw new ApiError(400, 'Early bird deadline must be before registration deadline');
      }
    }

    // Check for duplicate event (same title and start date)
    const existingEvent = await Event.findOne({
      title: eventData.title,
      'eventDate.startDate': eventData.eventDate.startDate,
      isActive: true
    });

    if (existingEvent) {
      throw new ApiError(409, 'An event with the same title and start date already exists.');
    }

    // Handle Free Event Logic
    const isFree = eventData.registration.isFree === true || eventData.registration.isFree === 'true';
    const fee = isFree ? 0 : eventData.registration.fee;

    // Create event object
    const newEvent = new Event({
      title: eventData.title,
      description: eventData.description,
      eventType: eventData.eventType,

      eventDate: {
        startDate: eventData.eventDate.startDate,
        endDate: eventData.eventDate.endDate,
        startTime: eventData.eventDate.startTime,
        endTime: eventData.eventDate.endTime,
      },

      venue: {
        name: eventData.venue.name,
        address: eventData.venue.address,
        city: eventData.venue.city,
        state: eventData.venue.state || '',
        pinCode: eventData.venue.pinCode || '',
        mapLink: eventData.venue.mapLink || '',
      },

      registration: {
        isOpen: eventData.registration.isOpen !== undefined ? eventData.registration.isOpen : true,
        isFree: isFree,
        deadline: eventData.registration.deadline,
        maxCapacity: eventData.registration.maxCapacity,
        fee: fee,
        earlyBirdFee: isFree ? 0 : (eventData.registration.earlyBirdFee || null),
        earlyBirdDeadline: eventData.registration.earlyBirdDeadline || null,
      },

      organizer: {
        createdBy: adminId,
        contactPerson: eventData.organizer.contactPerson,
        contactEmail: eventData.organizer.contactEmail,
        contactPhone: eventData.organizer.contactPhone,
      },

      status: eventData.status || 'draft',
    });

    // Save event
    const savedEvent = await newEvent.save();

    console.log(`✅ Event created: ${savedEvent.title} by Admin ${adminId}`);

    return savedEvent;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Get all events (Admin view)
const getAllEvents = async (filters = {}) => {
  try {
    const { status, eventType, page = 1, limit = 10 } = filters;

    const query = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    const skip = (page - 1) * limit;

    const events = await Event.find(query)
      .populate('organizer.createdBy', 'fullName email role')
      .sort({ 'eventDate.startDate': 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalEvents = await Event.countDocuments(query);

    return {
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalEvents / limit),
        totalEvents,
        limit: parseInt(limit),
        hasNextPage: page * limit < totalEvents,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

// Get single event by ID
const getEventById = async (eventId) => {
  try {
    const event = await Event.findById(eventId)
      .populate('organizer.createdBy', 'fullName email role')
      .populate('registrations.member', 'member.fullName email member.mobile establishment.name')
      .lean();

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    return event;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

// Update event
const updateEvent = async (eventId, updateData) => {
  try {
    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Update basic fields
    if (updateData.title) event.title = updateData.title;
    if (updateData.description) event.description = updateData.description;
    if (updateData.eventType) event.eventType = updateData.eventType;

    // Update event date
    if (updateData.eventDate) {
      if (updateData.eventDate.startDate) event.eventDate.startDate = updateData.eventDate.startDate;
      if (updateData.eventDate.endDate) event.eventDate.endDate = updateData.eventDate.endDate;
      if (updateData.eventDate.startTime) event.eventDate.startTime = updateData.eventDate.startTime;
      if (updateData.eventDate.endTime) event.eventDate.endTime = updateData.eventDate.endTime;
    }

    // Update venue
    if (updateData.venue) {
      if (updateData.venue.name) event.venue.name = updateData.venue.name;
      if (updateData.venue.address) event.venue.address = updateData.venue.address;
      if (updateData.venue.city) event.venue.city = updateData.venue.city;
      if (updateData.venue.state !== undefined) event.venue.state = updateData.venue.state;
      if (updateData.venue.pinCode !== undefined) event.venue.pinCode = updateData.venue.pinCode;
      if (updateData.venue.mapLink !== undefined) event.venue.mapLink = updateData.venue.mapLink;
    }

    // Update registration
    if (updateData.registration) {
      if (updateData.registration.isOpen !== undefined) event.registration.isOpen = updateData.registration.isOpen;
      if (updateData.registration.deadline) event.registration.deadline = updateData.registration.deadline;
      if (updateData.registration.maxCapacity) event.registration.maxCapacity = updateData.registration.maxCapacity;

      if (updateData.registration.isFree !== undefined) {
        event.registration.isFree = updateData.registration.isFree === true || updateData.registration.isFree === 'true';
      }

      const currentIsFree = event.registration.isFree;

      if (currentIsFree) {
        event.registration.fee = 0;
        event.registration.earlyBirdFee = 0;
      } else {
        if (updateData.registration.fee !== undefined) event.registration.fee = updateData.registration.fee;
        if (updateData.registration.earlyBirdFee !== undefined) event.registration.earlyBirdFee = updateData.registration.earlyBirdFee;
      }

      if (updateData.registration.earlyBirdDeadline !== undefined) event.registration.earlyBirdDeadline = updateData.registration.earlyBirdDeadline;
    }

    // Update organizer
    if (updateData.organizer) {
      if (updateData.organizer.contactPerson) event.organizer.contactPerson = updateData.organizer.contactPerson;
      if (updateData.organizer.contactEmail) event.organizer.contactEmail = updateData.organizer.contactEmail;
      if (updateData.organizer.contactPhone) event.organizer.contactPhone = updateData.organizer.contactPhone;
    }

    // Update status
    if (updateData.status) event.status = updateData.status;

    // Validate dates after update
    if (event.eventDate.endDate < event.eventDate.startDate) {
      throw new ApiError(400, 'Event end date must be after start date');
    }

    if (event.registration.deadline >= event.eventDate.startDate) {
      throw new ApiError(400, 'Registration deadline must be before event start date');
    }

    if (event.registration.earlyBirdDeadline && event.registration.earlyBirdDeadline >= event.registration.deadline) {
      throw new ApiError(400, 'Early bird deadline must be before registration deadline');
    }

    // Save updated event
    const updatedEvent = await event.save();

    console.log(`✅ Event updated: ${updatedEvent.title} (ID: ${updatedEvent._id})`);

    return updatedEvent;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

// Delete event (only if no registrations)
const deleteEvent = async (eventId) => {
  try {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Check if any users have registered
    if (event.registration.currentCount > 0 || event.registrations.length > 0) {
      throw new ApiError(
        400,
        `Cannot delete event. ${event.registration.currentCount} member(s) have already registered. Please update the event instead or contact members to cancel their registrations first.`
      );
    }

    // Only delete if no registrations exist
    await Event.findByIdAndDelete(eventId);

    console.log(`🗑️ Event deleted: ${event.title} (No registrations found)`);

    return {
      message: 'Event deleted successfully',
      deletedEvent: {
        id: event._id,
        title: event.title,
        eventType: event.eventType,
        deletedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
