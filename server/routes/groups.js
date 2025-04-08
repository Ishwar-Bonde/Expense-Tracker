import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all groups for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all groups where the user is a member
    const groups = await Group.find({
      'members.user': userId
    })
    .populate('members.user', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// Create new group
router.post('/', async (req, res) => {
  try {
    const { name, description, defaultCurrency } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Create the group
    const group = new Group({
      name,
      description,
      defaultCurrency: defaultCurrency || 'INR',
      createdBy: userId,
      members: [{ user: userId, role: 'admin' }] // Creator is automatically an admin
    });

    await group.save();
    
    // Populate member and creator details before sending response
    await group.populate('members.user', 'firstName lastName email');
    await group.populate('createdBy', 'firstName lastName email');
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// Get group by ID
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      member.user._id.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
});

// Update group
router.put('/:id', async (req, res) => {
  try {
    const { name, description, defaultCurrency } = req.body;
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(member => 
      member.user.toString() === userId && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update the group' });
    }

    group.name = name || group.name;
    group.description = description || group.description;
    group.defaultCurrency = defaultCurrency || group.defaultCurrency;
    group.updatedAt = new Date();

    await group.save();
    
    await group.populate('members.user', 'firstName lastName email');
    await group.populate('createdBy', 'firstName lastName email');

    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Failed to update group' });
  }
});

// Add member to group
router.post('/:id/members', async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(member => 
      member.user.toString() === userId && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Find user by email
    const newMember = await User.findOne({ email });
    if (!newMember) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === newMember._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add new member
    group.members.push({ user: newMember._id, role });
    await group.save();
    
    await group.populate('members.user', 'firstName lastName email');
    await group.populate('createdBy', 'firstName lastName email');

    res.json(group);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Failed to add member' });
  }
});

// Remove member from group
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(member => 
      member.user.toString() === userId && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    // Remove member
    group.members = group.members.filter(member => 
      member.user.toString() !== memberId
    );

    await group.save();
    
    await group.populate('members.user', 'firstName lastName email');
    await group.populate('createdBy', 'firstName lastName email');

    res.json(group);
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// Leave group
router.post('/:id/leave', async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the only admin
    const adminMembers = group.members.filter(member => member.role === 'admin');
    const isOnlyAdmin = adminMembers.length === 1 && 
      adminMembers[0].user.toString() === userId;

    if (isOnlyAdmin && group.members.length > 1) {
      return res.status(400).json({ 
        message: 'Cannot leave group as you are the only admin. Please assign another admin first.' 
      });
    }

    // Remove user from members
    group.members = group.members.filter(member => 
      member.user.toString() !== userId
    );

    // If no members left, delete the group
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return res.json({ message: 'Group deleted as it has no members' });
    }

    await group.save();
    
    await group.populate('members.user', 'firstName lastName email');
    await group.populate('createdBy', 'firstName lastName email');

    res.json(group);
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Failed to leave group' });
  }
});

// Delete group
router.delete('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(member => 
      member.user.toString() === userId && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    await Group.findByIdAndDelete(groupId);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Failed to delete group' });
  }
});

// Check if user exists by email
router.get('/check-user/:email', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select('firstName lastName email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ 
      user: { 
        _id: user._id, 
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ message: 'Failed to check user' });
  }
});

// Add expense category to group
router.post('/:id/categories', authenticateToken, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const groupId = req.params.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const member = group.members.find(m => m.user.toString() === req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add categories' });
    }

    // Initialize expenseCategories array if it doesn't exist
    if (!group.settings) {
      group.settings = {};
    }
    if (!group.settings.expenseCategories) {
      group.settings.expenseCategories = [];
    }

    // Check if category with same name already exists
    const categoryExists = group.settings.expenseCategories.some(cat => cat.name === name);
    if (categoryExists) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    // Add new category
    const newCategory = {
      name,
      color: color || '#6366F1',
      icon: icon || '💰'
    };
    
    group.settings.expenseCategories.push(newCategory);
    await group.save();
    
    res.status(200).json(group);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category' });
  }
});

// Delete expense category from group
router.delete('/:id/categories/:categoryName', authenticateToken, async (req, res) => {
  try {
    const { id, categoryName } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const member = group.members.find(m => m.user.toString() === req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete categories' });
    }

    // Remove category
    group.settings.expenseCategories = group.settings.expenseCategories.filter(
      cat => cat.name !== categoryName
    );

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Update group settings
router.put('/:id/settings', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(member => 
      member.user.toString() === userId && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update group settings' });
    }

    // Update group settings
    group.settings = req.body;

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Error updating group settings:', error);
    res.status(500).json({ message: 'Failed to update group settings' });
  }
});

export default router;
