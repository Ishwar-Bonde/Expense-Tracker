import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { Document } from '../../interfaces/Loan';
import axios from 'axios';

interface DocumentUploadProps {
  loanId: string;
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
}

interface EditDialogState {
  open: boolean;
  document: Document | null;
}

const Input = styled('input')({
  display: 'none',
});

const DocumentUpload: React.FC<DocumentUploadProps> = ({ loanId, documents, onDocumentsChange }) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, document: null });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const files = Array.from(event.target.files);
    setUploading(true);
    setUploadProgress(0);

    for (let file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('loanId', loanId);

      try {
        const response = await axios.post('/api/loans/documents/upload', formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          onUploadProgress: (progressEvent) => {
            const progress = (progressEvent.loaded / (progressEvent.total ?? 0)) * 100;
            setUploadProgress(progress);
          }
        });

        onDocumentsChange([...documents, response.data]);
      } catch (error) {
        console.error('Error uploading document:', error);
      }
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDelete = async (documentId: string) => {
    try {
      await fetch(`/api/loans/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      onDocumentsChange(documents.filter(doc => doc._id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleEdit = (document: Document) => {
    setEditDialog({ open: true, document });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.document?._id) return;

    try {
      const response = await fetch(`/api/loans/documents/${editDialog.document._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: editDialog.document.title,
          type: editDialog.document.type
        })
      });

      const updatedDoc = await response.json();
      onDocumentsChange(documents.map(doc => 
        doc._id === updatedDoc._id ? updatedDoc : doc
      ));
      setEditDialog({ open: false, document: null });
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleDownload = async (document: Document) => {
    if (!document._id) return;

    try {
      const response = await fetch(`/api/loans/documents/${document._id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = document.title;
      globalThis.document.body.appendChild(a);
      a.click();
      globalThis.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Documents
        </Typography>
        <label htmlFor="document-upload">
          <Input
            id="document-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
          />
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            disabled={uploading}
          >
            Upload Documents
          </Button>
        </label>
      </Box>

      {uploading && (
        <Box mb={2}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      <Paper>
        <List>
          {documents.map((doc) => (
            <ListItem key={doc._id}>
              <ListItemText
                primary={doc.title}
                secondary={doc.type}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleDownload(doc)}>
                  <DownloadIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => handleEdit(doc)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => handleDelete(doc._id!)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {documents.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No documents uploaded"
                secondary="Upload loan-related documents like agreements, receipts, etc."
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, document: null })}>
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={editDialog.document?.title || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              document: prev.document ? { ...prev.document, title: e.target.value } : null
            }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Type"
            value={editDialog.document?.type || ''}
            onChange={(e) => setEditDialog(prev => ({
              ...prev,
              document: prev.document ? { ...prev.document, type: e.target.value } : null
            }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, document: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentUpload;
