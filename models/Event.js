const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    // Basic Event Information
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Event title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['Annual Meet', 'FAM Trip', 'Training', 'Workshop', 'Seminar', 'Conference', 'Other'],
    },

    // Event Date & Time
    eventDate: {
      startDate: {
        type: Date,
        required: [true, 'Event start date is required'],
      },
      endDate: {
        type: Date,
        required: [true, 'Event end date is required'],
      },
      startTime: {
        type: String,
        required: [true, 'Event start time is required'],
      },
      endTime: {
        type: String,
        required: [true, 'Event end time is required'],
      },
    },

    // Venue & Location
    venue: {
      name: {
        type: String,
        required: [true, 'Venue name is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Venue address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      pinCode: {
        type: String,
        trim: true,
      },
      mapLink: {
        type: String,
        trim: true,
      },
    },

    // Registration Settings
    registration: {
      isOpen: {
        type: Boolean,
        default: true,
      },
      deadline: {
        type: Date,
        required: [true, 'Registration deadline is required'],
      },
      maxCapacity: {
        type: Number,
        required: [true, 'Max capacity is required'],
        min: [1, 'Capacity must be at least 1'],
      },
      currentCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      isFree: {
        type: Boolean,
        default: false,
      },
      fee: {
        type: Number,
        required: function () { return !this.registration.isFree; },
        min: [0, 'Fee cannot be negative'],
      },
      earlyBirdFee: {
        type: Number,
        min: 0,
      },
      earlyBirdDeadline: {
        type: Date,
      },
    },

    // Organizer Information
    organizer: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
      },
      contactPerson: {
        type: String,
        required: [true, 'Contact person name is required'],
        trim: true,
      },
      contactEmail: {
        type: String,
        required: [true, 'Contact email is required'],
        trim: true,
        lowercase: true,
      },
      contactPhone: {
        type: String,
        required: [true, 'Contact phone is required'],
        trim: true,
      },
    },

    // Registered Members
    registrations: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        confirmationNumber: {
          type: String,
          unique: true,
          sparse: true,
        },
        qrCode: {
          type: String,
        },
        payment: {
          status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
          },
          amount: {
            type: Number,
            required: true,
          },
          transactionId: {
            type: String,
            trim: true,
          },
          paidAt: {
            type: Date,
          },
          paymentMethod: {
            type: String,
            enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'other'],
          },
        },
        attendance: {
          isPresent: {
            type: Boolean,
            default: false,
          },
          checkedInAt: {
            type: Date,
          },
        },
      },
    ],

    // Event Status
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed'],
      default: 'draft',
    },

    // Activity Tracking
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
eventSchema.index({ status: 1, 'eventDate.startDate': 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ 'registration.isOpen': 1 });
eventSchema.index({ 'organizer.createdBy': 1 });

// Virtual for available seats
eventSchema.virtual('availableSeats').get(function () {
  return this.registration.maxCapacity - this.registration.currentCount;
});

// Virtual for is full
eventSchema.virtual('isFull').get(function () {
  return this.registration.currentCount >= this.registration.maxCapacity;
});

// Virtual for is registration closed
eventSchema.virtual('isRegistrationClosed').get(function () {
  const now = new Date();
  return (
    !this.registration.isOpen ||
    now > this.registration.deadline ||
    this.isFull ||
    this.status !== 'published'
  );
});

// Ensure virtuals are included in JSON
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

// Pre-save hook to validate dates
eventSchema.pre('save', async function (next) {
  // Validate event dates
  if (this.eventDate.endDate < this.eventDate.startDate) {
    throw new Error('Event end date must be after start date');
  }

  // Validate registration deadline
  if (this.registration.deadline > this.eventDate.startDate) {
    throw new Error('Registration deadline must be before event start date');
  }

  // Validate early bird deadline
  if (this.registration.earlyBirdDeadline && this.registration.earlyBirdDeadline > this.registration.deadline) {
    throw new Error('Early bird deadline must be before registration deadline');
  }

  // Auto-close registration if full
  if (this.registration.currentCount >= this.registration.maxCapacity) {
    this.registration.isOpen = false;
  }
});

module.exports = mongoose.model('Event', eventSchema);
