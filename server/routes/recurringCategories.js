import express from 'express';
import RecurringCategory from '../models/RecurringCategory.js';
import RecurringTransaction from '../models/RecurringTransaction.js';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all recurring categories for the user
router.get('/', async (req, res) => {
  try {
    const categories = await RecurringCategory.find({ userId: req.user.id });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching recurring categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new recurring category
router.post('/', async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    // Check if category already exists for this user
    const existingCategory = await RecurringCategory.findOne({
      userId: req.user.id,
      name: name.trim(),
      type
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'Recurring category already exists' });
    }

    const category = new RecurringCategory({
      userId: req.user.id,
      name: name.trim(),
      type,
      color,
      icon
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating recurring category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a recurring category
router.put('/:id', async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    
    const category = await RecurringCategory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({ message: 'Recurring category not found' });
    }

    // Check if update would create a duplicate
    if (name !== category.name || type !== category.type) {
      const existingCategory = await RecurringCategory.findOne({
        userId: req.user.id,
        name: name.trim(),
        type,
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Recurring category already exists' });
      }
    }

    category.name = name.trim();
    category.type = type;
    category.color = color;
    category.icon = icon;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating recurring category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a recurring category
router.delete('/:id', async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // First check if the category exists
      const category = await RecurringCategory.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Delete all recurring transactions that use this category
      await RecurringTransaction.deleteMany({ 
        categoryId: req.params.id,
        userId: req.user.id 
      });

      // Delete the category
      await RecurringCategory.findByIdAndDelete(req.params.id);

      await session.commitTransaction();
      session.endSession();

      res.json({ message: 'Category and related transactions deleted successfully' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting recurring category:', error);
    res.status(500).json({ message: 'Error deleting recurring category' });
  }
});

export default router;