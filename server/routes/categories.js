import express from 'express';
import Category from '../models/Category.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all categories for the user
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.id });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear categories cache
router.post('/clear-cache', async (req, res) => {
  try {
    // Since we're using MongoDB directly, there's no built-in caching
    // But we can refresh the data by doing a new query
    const categories = await Category.find({ userId: req.user.id });
    res.json({ message: 'Categories cache cleared', categories });
  } catch (error) {
    console.error('Error clearing categories cache:', error);
    res.status(500).json({ message: 'Failed to clear categories cache' });
  }
});

// Create a new category
router.post('/', async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    // Check if category already exists for this user
    const existingCategory = await Category.findOne({
      userId: req.user.id,
      name: name.trim(),
      type
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new Category({
      userId: req.user.id,
      name: name.trim(),
      type,
      color,
      icon
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a category
router.put('/:id', async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.isDefault) {
      return res.status(400).json({ message: 'Cannot modify default categories' });
    }

    // Check if the new name would create a duplicate
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        userId: req.user.id,
        name: name.trim(),
        type: category.type,
        _id: { $ne: category._id }
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    category.name = name?.trim() || category.name;
    category.color = color || category.color;
    category.icon = icon || category.icon;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.isDefault) {
      return res.status(400).json({ message: 'Cannot delete default categories' });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
