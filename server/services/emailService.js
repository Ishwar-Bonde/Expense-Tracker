import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email configuration missing');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Format currency
function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Send loan payment confirmation
export async function sendLoanPaymentConfirmation(user, payments) {
  if (!user?.email) {
    console.error('No user email provided');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) return;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Loan Payment Processed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;"> Loan Payment Confirmation</h2>
          <p>Hello ${user.firstName},</p>
          <p>The following loan payments have been processed:</p>
          
          ${payments.map(({ loan, transaction, paymentDetails }) => `
            <div style="background: white; border: 1px solid #e1e1e1; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #34495e; margin-top: 0;">${loan.title}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;">Payment #:</td>
                  <td style="padding: 8px 0; text-align: right;">${paymentDetails.paymentNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Amount Paid:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">
                    ${formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Principal:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    ${formatCurrency(paymentDetails.principalPayment, transaction.currency)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Interest:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    ${formatCurrency(paymentDetails.interestPayment, transaction.currency)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Remaining Balance:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    ${formatCurrency(paymentDetails.balance, transaction.currency)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">Date:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    ${new Date(transaction.date).toLocaleDateString()}
                  </td>
                </tr>
              </table>
            </div>
          `).join('')}
          
          <div style="margin-top: 20px;">
            <p style="color: #666;">
              To view complete loan details, please log in to your Expense Tracker account.
            </p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated message from your Expense Tracker.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending loan payment confirmation:', error);
  }
}

// Send loan payment reminder
export async function sendLoanPaymentReminder(user, upcomingPayments) {
  if (!user?.email) {
    console.error('No user email provided');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) return;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: ' Upcoming Loan Payments',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;"> Loan Payment Reminder</h2>
          <p>Hello ${user.firstName},</p>
          <p>You have the following loan payments coming up:</p>
          
          ${upcomingPayments.map(loan => {
            const emi = loan.calculateEMI();
            const daysUntilDue = Math.ceil((new Date(loan.nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24));
            
            return `
              <div style="background: white; border: 1px solid #e1e1e1; border-radius: 5px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #34495e; margin-top: 0;">${loan.title}</h3>
                
                <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 10px 0;">
                  <p style="margin: 0;">Payment due in ${daysUntilDue} days</p>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;">Payment Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold;">
                      ${formatCurrency(emi, loan.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">Due Date:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${new Date(loan.nextPaymentDate).toLocaleDateString()}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">Remaining Balance:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${formatCurrency(loan.remainingAmount, loan.currency)}
                    </td>
                  </tr>
                </table>

                ${loan.contact ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e1e1e1;">
                    <h4 style="color: #34495e; margin-top: 0;">Contact Information</h4>
                    <p style="margin: 5px 0;">Name: ${loan.contact.name}</p>
                    ${loan.contact.phone ? `<p style="margin: 5px 0;">Phone: ${loan.contact.phone}</p>` : ''}
                    ${loan.contact.email ? `<p style="margin: 5px 0;">Email: ${loan.contact.email}</p>` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
          
          <div style="margin-top: 20px;">
            <p style="color: #666;">
              Please ensure sufficient funds are available for these payments.
              To view complete loan details or make a payment, please log in to your Expense Tracker account.
            </p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>This is an automated message from your Expense Tracker.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending loan payment reminder:', error);
  }
}
