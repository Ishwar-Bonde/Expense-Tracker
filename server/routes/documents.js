import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import Loan from '../models/Loan.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/documents';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and DOC files are allowed.'));
    }
  }
});

// Upload document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { loanId } = req.body;
    const loan = await Loan.findOne({ _id: loanId, userId: req.user.id });
    
    if (!loan) {
      // Delete uploaded file if loan not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Loan not found' });
    }

    const document = {
      title: path.parse(req.file.originalname).name,
      url: req.file.path,
      type: path.extname(req.file.originalname).substring(1)
    };

    loan.documents.push(document);
    await loan.save();

    res.status(201).json(document);
  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ message: error.message });
  }
});

// Update document details
router.patch('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { title, type } = req.body;
    const loan = await Loan.findOne({
      userId: req.user.id,
      'documents._id': req.params.documentId
    });

    if (!loan) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = loan.documents.id(req.params.documentId);
    document.title = title;
    document.type = type;
    
    await loan.save();
    res.json(document);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findOne({
      userId: req.user.id,
      'documents._id': req.params.documentId
    });

    if (!loan) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = loan.documents.id(req.params.documentId);
    
    // Delete file from storage
    if (fs.existsSync(document.url)) {
      fs.unlinkSync(document.url);
    }

    loan.documents.pull(req.params.documentId);
    await loan.save();
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Download document
router.get('/:documentId/download', authenticateToken, async (req, res) => {
  try {
    const loan = await Loan.findOne({
      userId: req.user.id,
      'documents._id': req.params.documentId
    });

    if (!loan) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = loan.documents.id(req.params.documentId);
    
    if (!fs.existsSync(document.url)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(document.url, `${document.title}.${document.type}`);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
