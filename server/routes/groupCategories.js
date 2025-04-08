import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import GroupCategory from '../models/GroupCategory.js';
import Group from '../models/Group.js';

const router = express.Router();

// Get all categories for a group
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if user has access to the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = group.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const categories = await GroupCategory.find({ groupId }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Add a new category
router.post('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, color, icon } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const member = group.members.find(m => m.user.toString() === req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add categories' });
    }

    // Create new category
    const newCategory = new GroupCategory({
      name,
      color: color || '#6366F1',
      icon: icon || '💰',
      groupId
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category with this name already exists in the group' });
    }
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category' });
  }
});

// Delete a category
router.delete('/:groupId/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { groupId, categoryId } = req.params;

    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const member = group.members.find(m => m.user.toString() === req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete categories' });
    }

    const category = await GroupCategory.findOneAndDelete({
      _id: categoryId,
      groupId
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Update a category
router.put('/:groupId/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { groupId, categoryId } = req.params;
    const { name, color, icon } = req.body;

    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const member = group.members.find(m => m.user.toString() === req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update categories' });
    }

    const category = await GroupCategory.findOneAndUpdate(
      { _id: categoryId, groupId },
      { name, color, icon },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category with this name already exists in the group' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

export default router;
