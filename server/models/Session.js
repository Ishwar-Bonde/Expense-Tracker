import mongoose from 'mongoose';

const deviceInfoSchema = new mongoose.Schema({
    userAgent: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true
    }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    deviceInfo: {
        type: deviceInfoSchema,
        required: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Index for faster queries
sessionSchema.index({ userId: 1, token: 1 });
sessionSchema.index({ lastActivity: 1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
