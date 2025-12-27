// import News from "../models/newsmodel.js";
// import nodemailer from "nodemailer";
// import dotenv from "dotenv";
// import transporter from "../config/nodemailer.js";
// import { getEmailTemplate, getNewsletterTemplate } from "../email.js";

// const submitNewsletter = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Validate email
//     if (!email) {
//       return res.status(400).json({ 
//         message: 'Email is required',
//         success: false 
//       });
//     }

//     // Basic email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ 
//         message: 'Please provide a valid email address',
//         success: false 
//       });
//     }

//     // Check if email already exists
//     const existingSubscription = await News.findOne({ email: email.toLowerCase().trim() });
//     if (existingSubscription) {
//       return res.status(400).json({ 
//         message: 'Email already subscribed to newsletter',
//         success: false 
//       });
//     }

//     const newNewsletter = new News({
//       email: email.toLowerCase().trim(),
//     });

//     const savedNewsletter = await newNewsletter.save();

//     const mailOptions = {
//       from: process.env.EMAIL,
//       to: email,
//       subject: "Welcome to BuildEstate Newsletter! 🏠",
//       html: getNewsletterTemplate(email),
//     };

//     await transporter.sendMail(mailOptions);

//     res.json({ 
//       message: "Newsletter subscribed successfully",
//       success: true 
//     });
//   } catch (error) {
//     console.error("Error saving newsletter data:", error);
//     res.status(500).json({ 
//       message: "Server error",
//       success: false 
//     });
//   }
// };

// export { submitNewsletter };

import News from "../models/newsmodel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import transporter from "../config/nodemailer.js";
import { getEmailTemplate, getNewsletterTemplate } from "../email.js";

const submitNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        success: false 
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address',
        success: false 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingSubscription = await News.findOne({ email: normalizedEmail });
    if (existingSubscription) {
      return res.status(400).json({ 
        message: 'Email already subscribed to newsletter',
        success: false 
      });
    }

    // Check if transporter is configured
    if (!transporter) {
      console.error("❌ Email transporter not configured. Check SMTP credentials in .env.local");
      return res.status(503).json({ 
        message: 'Email service is not configured. Please contact support.',
        success: false 
      });
    }

    // Check if EMAIL env variable is set
    if (!process.env.EMAIL) {
      console.error("❌ EMAIL environment variable not set");
      return res.status(503).json({ 
        message: 'Email service configuration incomplete.',
        success: false 
      });
    }

    // Save newsletter subscription to database
    const newNewsletter = new News({
      email: normalizedEmail,
    });

    const savedNewsletter = await newNewsletter.save();
    console.log(`✅ Newsletter subscription saved for: ${normalizedEmail}`);

    // Prepare email
    const mailOptions = {
      from: `"BuildEstate" <${process.env.EMAIL}>`,
      to: normalizedEmail,
      subject: "Welcome to BuildEstate Newsletter! 🏠",
      html: getNewsletterTemplate(normalizedEmail),
    };

    // Send welcome email
    try {
      const emailInfo = await transporter.sendMail(mailOptions);
      console.log(`✅ Newsletter welcome email sent to ${normalizedEmail}:`, emailInfo.messageId);
      
      res.json({ 
        message: "Newsletter subscribed successfully! Check your email for confirmation.",
        success: true 
      });
    } catch (emailError) {
      console.error("❌ Error sending newsletter email:", emailError);
      
      // Subscription is saved, but email failed - still return success but log the error
      // This way the user knows they're subscribed even if email delivery fails
      console.warn(`⚠️  Newsletter subscription saved but email failed to send for: ${normalizedEmail}`);
      
      res.json({ 
        message: "Newsletter subscription saved, but confirmation email could not be sent. Please check your email address.",
        success: true,
        warning: "Email delivery failed"
      });
    }
  } catch (error) {
    console.error("❌ Error in newsletter subscription:", error);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid email format',
        success: false 
      });
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({ 
        message: 'Database error. Please try again later.',
        success: false 
      });
    }
    
    res.status(500).json({ 
      message: error.message || "Server error. Please try again later.",
      success: false 
    });
  }
};

export { submitNewsletter };
