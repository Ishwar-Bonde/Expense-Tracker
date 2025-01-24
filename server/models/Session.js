import mongoose from 'mongoose';

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
        type: String,
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
