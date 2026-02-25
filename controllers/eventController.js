const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require('../services/eventService');
const { successResponse } = require('../utils/responseHelper');
const ApiError = require('../utils/ApiError');

// Create new event (Admin only)
const createEventController = async (req, res) => {
  const adminId = req.admin.id;
  const eventData = req.body;

  const event = await createEvent(eventData, adminId);

  successResponse(
    res,
    {
      event: {
        id: event._id,
        title: event.title,
        eventType: event.eventType,
        startDate: event.eventDate.startDate,
        endDate: event.eventDate.endDate,
        venue: event.venue,
        registration: event.registration,
        status: event.status,
        createdAt: event.createdAt,
      },
    },
    'Event created successfully',
    201
  );
};

// Get all events (Admin view)
const getAllEventsController = async (req, res) => {
  const { status, eventType, page, limit } = req.query;

  const result = await getAllEvents({ status, eventType, page, limit });

  successResponse(
    res,
    {
      events: result.events,
      pagination: result.pagination,
    },
    'Events retrieved successfully'
  );
};

// Get single event details
const getEventDetailsController = async (req, res) => {
  const { id } = req.params;

  const event = await getEventById(id);

  successResponse(
    res,
    { event },
    'Event details retrieved successfully'
  );
};

// Update event (Admin only)
const updateEventController = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const adminRole = req.admin.role;
  const adminName = req.admin.fullName;

  const updatedEvent = await updateEvent(id, updateData);

  console.log(`🔧 Event updated by ${adminRole} (${adminName})`);

  successResponse(
    res,
    {
      event: {
        id: updatedEvent._id,
        title: updatedEvent.title,
        eventType: updatedEvent.eventType,
        startDate: updatedEvent.eventDate.startDate,
        endDate: updatedEvent.eventDate.endDate,
        venue: updatedEvent.venue,
        registration: updatedEvent.registration,
        status: updatedEvent.status,
        updatedAt: updatedEvent.updatedAt,
      },
    },
    'Event updated successfully'
  );
};

// Delete event (Admin only)
const deleteEventController = async (req, res) => {
  const { id } = req.params;
  const adminRole = req.admin.role;
  const adminName = req.admin.fullName;

  const result = await deleteEvent(id);

  console.log(`🗑️ Event deleted by ${adminRole} (${adminName}): ${result.deletedEvent.title}`);

  successResponse(
    res,
    {
      deletedEvent: result.deletedEvent,
      deletedBy: {
        role: adminRole,
        name: adminName,
      },
    },
    result.message
  );
};

module.exports = {
  createEventController,
  getAllEventsController,
  getEventDetailsController,
  updateEventController,
  deleteEventController,
};
