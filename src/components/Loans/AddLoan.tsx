import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Step,
  StepLabel as MuiStepLabel,
  Stepper,
  Typography,
  useTheme,
  StepIconProps,
  styled,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  StepConnector as MuiStepConnector,
  stepConnectorClasses,
} from '@mui/material';
import { Check as CheckCircleIcon, Circle as CircleIcon, Info as InfoIcon } from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../../config';

// Styled Components
const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: '2rem',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0.85))'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))',
  backdropFilter: 'blur(10px)',
}));

const StyledStepper = styled(Box)(({ theme }) => ({
  marginBottom: '3rem',
  padding: '2rem',
  borderRadius: '20px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(17, 24, 39, 0.7)'
    : 'rgba(255, 255, 255, 0.7)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.17)',
  backdropFilter: 'blur(4px)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)',
}));

const StepConnector = styled(MuiStepConnector)(({ theme }) => ({
  [`& .${stepConnectorClasses.line}`]: {
    height: '3px',
    border: 0,
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
  },
  [`&.${stepConnectorClasses.active}, &.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    },
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(17, 25, 40, 0.98), rgba(28, 37, 65, 0.98))'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98))',
  backdropFilter: 'blur(20px)',
  borderRadius: '28px',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)'
    : '0 8px 32px rgba(31, 38, 135, 0.15), 0 4px 16px rgba(31, 38, 135, 0.1)',
  padding: theme.spacing(4),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
  },
}));

const StyledInput = styled('input')(({ theme }) => ({
  width: '100%',
  padding: '16px 20px',
  fontSize: '1rem',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '16px',
  color: theme.palette.mode === 'dark' ? '#fff' : '#000',
  outline: 'none',
  transition: 'all 0.2s ease-in-out',
  '&:focus': {
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    boxShadow: `0 0 0 2px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  },
  '&::placeholder': {
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
  },
}));

const StyledTextArea = styled('textarea')(({ theme }) => ({
  width: '100%',
  padding: '16px 20px',
  fontSize: '1rem',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '16px',
  color: theme.palette.mode === 'dark' ? '#fff' : '#000',
  outline: 'none',
  resize: 'vertical',
  minHeight: '120px',
  transition: 'all 0.2s ease-in-out',
  '&:focus': {
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    boxShadow: `0 0 0 2px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  },
  '&::placeholder': {
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
  },
}));

const StyledSelect = styled('select')(({ theme }) => ({
  width: '100%',
  padding: '16px 20px',
  fontSize: '1rem',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '16px',
  color: theme.palette.mode === 'dark' ? '#fff' : '#000',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:focus': {
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    boxShadow: `0 0 0 2px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  },
}));

const StepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)',
  zIndex: 1,
  color: theme.palette.mode === 'dark' ? '#fff' : '#000',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  ...(ownerState.active && {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
  }),
  ...(ownerState.completed && {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  }),
}));

const StyledStepLabel = styled(MuiStepLabel)(({ theme }) => ({
  '& .MuiStepLabel-label': {
    marginTop: '8px',
    fontSize: '0.9rem',
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    '&.Mui-active': {
      color: theme.palette.mode === 'dark' ? '#fff' : '#000',
      fontWeight: 600,
    },
    '&.Mui-completed': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
    },
  },
  '& .MuiStepLabel-iconContainer': {
    paddingRight: '0',
  },
}));

const FieldContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(17, 24, 39, 0.7)'
    : 'rgba(255, 255, 255, 0.7)',
  borderRadius: '20px',
  padding: theme.spacing(4),
  backdropFilter: 'blur(4px)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)',
}));

const FieldTitle = styled(Typography)({
  fontSize: '1rem',
  fontWeight: 600,
  marginBottom: '8px',
  display: 'inline-block',
});

const FieldHelper = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
  marginTop: '4px',
}));

const InfoIconWrapper = styled('span')({
  marginLeft: '8px',
  display: 'inline-flex',
  verticalAlign: 'text-top',
  '& svg': {
    width: '16px',
    height: '16px',
  },
});

const ReviewField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .label': {
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    marginBottom: '4px',
  },
  '& .value': {
    color: theme.palette.mode === 'dark' ? '#fff' : '#000',
    fontWeight: 500,
  },
}));

const ErrorText = styled('p')(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: '0.875rem',
  marginTop: '4px',
  marginBottom: '4px',
}));

const StyledDatePicker = styled(DatePicker)(({ theme }) => ({
  width: '100%',
  '& .MuiInputBase-root': {
    padding: '8px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  }
}));

interface FormData {
  title: string;
  type: 'given' | 'taken';
  purpose: 'education' | 'personal' | 'home' | 'vehicle' | 'business' | 'other';
  amount: string;
  interestRate: string;
  startDate: string;
  endDate: string;
  paymentFrequency: string;
  description: string;
  contact: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    address: string;
  };
  collateral: {
    type: 'property' | 'vehicle' | 'jewelry' | 'investment' | 'other' | 'none';
    description: string;
    value: string;
  };
  guarantor: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    address: string;
  };
  penalties: {
    rate: string;
    amount: string;
  };
}

const initialFormData: FormData = {
  title: '',
  type: 'given',
  purpose: 'personal',
  amount: '',
  interestRate: '0',
  startDate: '',
  endDate: '',
  paymentFrequency: '',
  description: '',
  contact: {
    name: '',
    phone: '',
    email: '',
    relationship: '',
    address: ''
  },
  collateral: {
    type: 'none',
    description: '',
    value: ''
  },
  guarantor: {
    name: '',
    phone: '',
    email: '',
    relationship: '',
    address: ''
  },
  penalties: {
    rate: '0',
    amount: '0'
  }
};

const AddLoan: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        const parentObj = prev[parent as keyof FormData];
        if (typeof parentObj === 'object' && parentObj !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentObj,
              [child]: value
            }
          };
        }
        return prev;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate') => (date: dayjs.Dayjs | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: date.format('YYYY-MM-DD')
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // Validate required fields
      const requiredFields = {
        title: 'Title',
        type: 'Type',
        purpose: 'Purpose',
        amount: 'Amount',
        interestRate: 'Interest Rate',
        startDate: 'Start Date',
        paymentFrequency: 'Payment Frequency',
        'contact.name': 'Contact Name'
      };

      for (const [field, label] of Object.entries(requiredFields)) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          const parentObj = formData[parent as keyof FormData];
          if (typeof parentObj === 'object' && parentObj !== null && !parentObj[child as keyof typeof parentObj]) {
            throw new Error(`${label} is required`);
          }
        } else if (!formData[field as keyof FormData]) {
          throw new Error(`${label} is required`);
        }
      }

      // Ensure purpose is one of the valid values
      const validPurposes = ['education', 'personal', 'home', 'vehicle', 'business', 'other'];
      if (!validPurposes.includes(formData.purpose)) {
        throw new Error('Invalid purpose selected');
      }

      // Calculate installment amount based on total amount and payment frequency
      const totalAmount = Number(formData.amount);
      let installmentAmount = totalAmount;
      let numberOfPayments = 1;
      
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      switch(formData.paymentFrequency) {
        case 'daily':
          numberOfPayments = durationInDays;
          break;
        case 'weekly':
          numberOfPayments = Math.ceil(durationInDays / 7);
          break;
        case 'monthly':
          numberOfPayments = Math.ceil(durationInDays / 30);
          break;
        case 'quarterly':
          numberOfPayments = Math.ceil(durationInDays / 90);
          break;
        case 'yearly':
          numberOfPayments = Math.ceil(durationInDays / 365);
          break;
        case 'one-time':
          numberOfPayments = 1;
          break;
      }
      
      // Calculate installment amount and round to 2 decimal places
      installmentAmount = Math.round((totalAmount / numberOfPayments) * 100) / 100;

      const submissionData = {
        title: formData.title,
        type: formData.type,
        purpose: formData.purpose,
        amount: totalAmount,
        interestRate: Number(formData.interestRate),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        paymentFrequency: formData.paymentFrequency,
        description: formData.description,
        contact: formData.contact,
        collateral: {
          ...formData.collateral,
          value: Number(formData.collateral.value)
        },
        guarantor: formData.guarantor,
        penalties: {
          ...formData.penalties,
          rate: Number(formData.penalties.rate),
          amount: Number(formData.penalties.amount)
        },
        remainingAmount: totalAmount,
        installmentAmount: installmentAmount
      };

      const response = await fetch(`${API_BASE_URL}/api/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create loan');
      }

      const data = await response.json();
      navigate('/loans', { state: { message: 'Loan created successfully!' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
  };

  const steps = [
    { label: 'Basic Info', description: 'Enter basic loan information' },
    { label: 'Contact Info', description: 'Enter contact information' },
    { label: 'Loan Details', description: 'Specify loan amount and terms' },
    { label: 'Collateral & Guarantor', description: 'Enter collateral and guarantor information' },
    { label: 'Review', description: 'Review and confirm' },
  ];

  const renderBasicInfo = () => (
    <FieldContainer>
      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Title</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="Give your loan a memorable name to easily identify it later" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="e.g., Home Renovation Loan 2024"
        />
        {error && <ErrorText>{error}</ErrorText>}
        <FieldHelper variant="body2">Choose a descriptive name that helps you remember the purpose of this loan</FieldHelper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Loan Type</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="'Given' means you're lending money, 'Taken' means you're borrowing money" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledSelect
          name="type"
          value={formData.type}
          onChange={handleInputChange}
        >
          <option value="given">Given (Lending)</option>
          <option value="taken">Taken (Borrowing)</option>
        </StyledSelect>
        {error && <ErrorText>{error}</ErrorText>}
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Purpose</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="Select the main purpose or category of this loan" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledSelect
          name="purpose"
          value={formData.purpose}
          onChange={handleInputChange}
        >
          <option value="personal">Personal</option>
          <option value="education">Education</option>
          <option value="business">Business</option>
          <option value="home">Home/Property</option>
          <option value="vehicle">Vehicle</option>
          <option value="other">Other</option>
        </StyledSelect>
        {error && <ErrorText>{error}</ErrorText>}
      </Box>

      <Box>
        <div>
          <FieldTitle>Description</FieldTitle>
          <Tooltip 
            title="Add any important details or terms about the loan" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledTextArea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Enter additional details about the loan, terms, or any special conditions..."
        />
        <FieldHelper variant="body2">Include any specific terms, conditions, or important notes about this loan</FieldHelper>
      </Box>
    </FieldContainer>
  );

  const renderContactInfo = () => (
    <FieldContainer>
      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Contact Name</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="Name of the person or organization involved in this loan" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="text"
          name="contact.name"
          value={formData.contact.name}
          onChange={handleInputChange}
          placeholder="Enter the full name"
        />
        {error && <ErrorText>{error}</ErrorText>}
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Phone Number</FieldTitle>
          <Tooltip 
            title="Contact phone number for loan-related communications" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="tel"
          name="contact.phone"
          value={formData.contact.phone}
          onChange={handleInputChange}
          placeholder="+91 XXXXX XXXXX"
        />
        <FieldHelper variant="body2">Include country code for international numbers</FieldHelper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Email Address</FieldTitle>
          <Tooltip 
            title="Email address for loan notifications and updates" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="email"
          name="contact.email"
          value={formData.contact.email}
          onChange={handleInputChange}
          placeholder="email@example.com"
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Relationship</FieldTitle>
          <Tooltip 
            title="Your relationship with the person or organization" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="text"
          name="contact.relationship"
          value={formData.contact.relationship}
          onChange={handleInputChange}
          placeholder="e.g., Friend, Family, Business Partner"
        />
      </Box>

      <Box>
        <div>
          <FieldTitle>Address</FieldTitle>
          <Tooltip 
            title="Physical address for official documentation" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledTextArea
          name="contact.address"
          value={formData.contact.address}
          onChange={handleInputChange}
          placeholder="Enter complete address..."
        />
      </Box>
    </FieldContainer>
  );

  const renderLoanDetails = () => (
    <FieldContainer>
      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Loan Amount</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="Enter the principal amount of the loan" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleInputChange}
          placeholder="Enter loan amount"
          min="0"
          step="100"
        />
        <FieldHelper variant="body2">Enter the total amount of the loan</FieldHelper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Interest Rate (%)</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="Annual interest rate percentage" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledInput
          type="number"
          name="interestRate"
          value={formData.interestRate}
          onChange={handleInputChange}
          placeholder="Enter interest rate"
          min="0"
          step="0.1"
        />
        <FieldHelper variant="body2">Enter the annual interest rate as a percentage</FieldHelper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Start Date</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="When does the loan period begin?" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <StyledDatePicker
            value={formData.startDate ? dayjs(formData.startDate) : null}
            onChange={handleDateChange('startDate')}
            format="DD/MM/YYYY"
            maxDate={dayjs()}
            open={startDateOpen}
            onOpen={() => setStartDateOpen(true)}
            onClose={() => setStartDateOpen(false)}
            slotProps={{
              textField: {
                placeholder: 'Select start date',
                error: Boolean(error && error.includes('start date')),
                inputProps: { 
                  readOnly: true,
                },
                sx: {
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    },
                    '&:hover fieldset': {
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                    },
                    '&.Mui-focused fieldset': {
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    },
                  },
                },
              },
              field: {
                readOnly: true,
              },
            }}
            closeOnSelect
          />
        </LocalizationProvider>
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>End Date</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="When is the loan due to be fully repaid?" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <StyledDatePicker
            value={formData.endDate ? dayjs(formData.endDate) : null}
            onChange={handleDateChange('endDate')}
            format="DD/MM/YYYY"
            minDate={formData.startDate ? dayjs(formData.startDate).add(1, 'day') : undefined}
            open={endDateOpen}
            onOpen={() => setEndDateOpen(true)}
            onClose={() => setEndDateOpen(false)}
            slotProps={{
              textField: {
                placeholder: 'Select end date',
                error: Boolean(error && error.includes('end date')),
                inputProps: { 
                  readOnly: true,
                },
                sx: {
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    },
                    '&:hover fieldset': {
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                    },
                    '&.Mui-focused fieldset': {
                      border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    },
                  },
                },
              },
              field: {
                readOnly: true,
              },
            }}
            closeOnSelect
          />
        </LocalizationProvider>
      </Box>

      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Payment Frequency</FieldTitle> <Typography variant="body1" sx={{ display: 'inline' }} color="error">*</Typography>
          <Tooltip 
            title="How often are payments expected to be made?" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledSelect
          name="paymentFrequency"
          value={formData.paymentFrequency}
          onChange={handleInputChange}
        >
          <option value="">Select Payment Frequency</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
          <option value="one-time">One Time</option>
        </StyledSelect>
        <FieldHelper variant="body2">Select how often loan payments should be made</FieldHelper>
      </Box>
    </FieldContainer>
  );

  const renderCollateralInfo = () => (
    <FieldContainer>
      <Box sx={{ mb: 3 }}>
        <div>
          <FieldTitle>Collateral Type</FieldTitle>
          <Tooltip 
            title="Select the type of asset being used as collateral" 
            placement="top" 
            arrow
          >
            <InfoIconWrapper>
              <InfoIcon />
            </InfoIconWrapper>
          </Tooltip>
        </div>
        <StyledSelect
          name="collateral.type"
          value={formData.collateral.type}
          onChange={handleInputChange}
        >
          <option value="none">No Collateral</option>
          <option value="property">Property</option>
          <option value="vehicle">Vehicle</option>
          <option value="jewelry">Jewelry</option>
          <option value="investment">Investment</option>
          <option value="other">Other</option>
        </StyledSelect>
        <FieldHelper variant="body2">Select the type of asset being offered as security</FieldHelper>
      </Box>

      {formData.collateral.type !== 'none' && (
        <>
          <Box sx={{ mb: 3 }}>
            <div>
              <FieldTitle>Collateral Description</FieldTitle>
              <Tooltip 
                title="Provide details about the collateral" 
                placement="top" 
                arrow
              >
                <InfoIconWrapper>
                  <InfoIcon />
                </InfoIconWrapper>
              </Tooltip>
            </div>
            <StyledTextArea
              name="collateral.description"
              value={formData.collateral.description}
              onChange={handleInputChange}
              placeholder="Describe the collateral in detail..."
            />
            <FieldHelper variant="body2">Include important details like location, condition, or identifying information</FieldHelper>
          </Box>

          <Box>
            <div>
              <FieldTitle>Collateral Value</FieldTitle>
              <Tooltip 
                title="Estimated market value of the collateral" 
                placement="top" 
                arrow
              >
                <InfoIconWrapper>
                  <InfoIcon />
                </InfoIconWrapper>
              </Tooltip>
            </div>
            <StyledInput
              type="number"
              name="collateral.value"
              value={formData.collateral.value}
              onChange={handleInputChange}
              placeholder="Enter estimated value"
              min="0"
              step="100"
            />
            <FieldHelper variant="body2">Current market value of the collateral in the same currency as the loan</FieldHelper>
          </Box>
        </>
      )}
    </FieldContainer>
  );

  const renderReview = () => (
    <FieldContainer>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
        <ReviewField>
          <Typography className="label">Title</Typography>
          <Typography className="value">{formData.title}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Type</Typography>
          <Typography className="value">{formData.type}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Purpose</Typography>
          <Typography className="value">{formData.purpose}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Description</Typography>
          <Typography className="value">{formData.description}</Typography>
        </ReviewField>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Contact Information</Typography>
        <ReviewField>
          <Typography className="label">Name</Typography>
          <Typography className="value">{formData.contact.name}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Phone</Typography>
          <Typography className="value">{formData.contact.phone}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Email</Typography>
          <Typography className="value">{formData.contact.email}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Relationship</Typography>
          <Typography className="value">{formData.contact.relationship}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Address</Typography>
          <Typography className="value">{formData.contact.address}</Typography>
        </ReviewField>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Loan Details</Typography>
        <ReviewField>
          <Typography className="label">Amount</Typography>
          <Typography className="value">{formData.amount}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Interest Rate</Typography>
          <Typography className="value">{formData.interestRate}%</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Start Date</Typography>
          <Typography className="value">{formData.startDate}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">End Date</Typography>
          <Typography className="value">{formData.endDate}</Typography>
        </ReviewField>
        <ReviewField>
          <Typography className="label">Payment Frequency</Typography>
          <Typography className="value">{formData.paymentFrequency}</Typography>
        </ReviewField>
      </Box>

      {formData.collateral.type !== 'none' && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Collateral Information</Typography>
          <ReviewField>
            <Typography className="label">Type</Typography>
            <Typography className="value">{formData.collateral.type}</Typography>
          </ReviewField>
          <ReviewField>
            <Typography className="label">Description</Typography>
            <Typography className="value">{formData.collateral.description}</Typography>
          </ReviewField>
          <ReviewField>
            <Typography className="label">Value</Typography>
            <Typography className="value">{formData.collateral.value}</Typography>
          </ReviewField>
        </Box>
      )}
    </FieldContainer>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderContactInfo();
      case 2:
        return renderLoanDetails();
      case 3:
        return renderCollateralInfo();
      case 4:
        return renderReview();
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="md">
        <StyledPaper>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setError('')}
                >
                  ×
                </IconButton>
              }
            >
              {error}
            </Alert>
          )}

          <StyledStepper>
            <Stepper 
              activeStep={activeStep} 
              alternativeLabel 
              connector={<StepConnector />}
            >
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StyledStepLabel>
                    {step.label}
                    <Tooltip title={step.description} placement="top">
                      <InfoIconWrapper>
                        <InfoIcon fontSize="small" />
                      </InfoIconWrapper>
                    </Tooltip>
                  </StyledStepLabel>
                </Step>
              ))}
            </Stepper>
          </StyledStepper>

          <Box>
            {renderStepContent(activeStep)}
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 4,
              gap: 2
            }}>
              {activeStep === 0 ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => navigate('/loans')}
                  sx={{ 
                    minWidth: 100,
                    borderRadius: 2
                  }}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  sx={{ 
                    minWidth: 100,
                    borderRadius: 2
                  }}
                >
                  Back
                </Button>
              )}
              
              <Box sx={{ flex: '1 1 auto' }} />

              <Button
                variant="contained"
                onClick={activeStep === steps.length - 1 ? handleSubmit : () => setActiveStep(activeStep + 1)}
                disabled={isSubmitting}
                sx={{
                  minWidth: 100,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #2196F3 60%, #21CBF3 90%)',
                  }
                }}
              >
                {activeStep === steps.length - 1 ? (
                  isSubmitting ? 'Submitting...' : 'Submit'
                ) : (
                  'Next'
                )}
              </Button>
            </Box>
          </Box>
        </StyledPaper>
      </Container>
    </PageContainer>
  );
};

export default AddLoan;