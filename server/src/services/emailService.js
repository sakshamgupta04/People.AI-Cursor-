import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send personality test invitation email to candidate
 * @param {string} to - Recipient email address
 * @param {string} candidateName - Candidate's name
 * @param {string} testLink - URL to the Big5 personality test
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendPersonalityTestEmail(to, candidateName, testLink) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    if (!to || !to.trim()) {
      throw new Error('Recipient email is required');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    // Create email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Personality Test Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Personality Assessment Invitation</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${candidateName || 'Candidate'},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for applying with us! As part of our recruitment process, we'd like to invite you to complete a brief personality assessment.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
              This assessment helps us better understand your work style and find the best role fit for you. It takes approximately 10-15 minutes to complete and consists of 50 questions.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${testLink}" 
                 style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 18px; 
                        display: inline-block; 
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        transition: transform 0.2s;">
                Take the Personality Test
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>📝 Note:</strong> Please complete this assessment within the next 7 days. Your responses are confidential and will be used solely for recruitment purposes.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If you have any questions or concerns, please don't hesitate to reach out to us.
            </p>
            
            <p style="font-size: 16px; margin-top: 20px;">
              Best regards,<br>
              <strong>The Recruitment Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const emailText = `
Hello ${candidateName || 'Candidate'},

Thank you for applying with us! As part of our recruitment process, we'd like to invite you to complete a brief personality assessment.

This assessment helps us better understand your work style and find the best role fit for you. It takes approximately 10-15 minutes to complete and consists of 50 questions.

Take the test here: ${testLink}

Note: Please complete this assessment within the next 7 days. Your responses are confidential and will be used solely for recruitment purposes.

If you have any questions or concerns, please don't hesitate to reach out to us.

Best regards,
The Recruitment Team
    `.trim();

    console.log('Sending personality test email to:', to);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to.trim(),
      subject: 'Personality Assessment Invitation - Complete Your Test',
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('Resend API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log('Email sent successfully:', data);
    return {
      success: true,
      messageId: data.id,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while sending email'
    };
  }
}

/**
 * Send general email (for future use)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 */
export async function sendEmail(to, subject, html, text) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to.trim(),
      subject,
      html,
      text,
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      messageId: data.id
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

