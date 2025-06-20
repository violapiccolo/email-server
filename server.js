const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting - prevent spam
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/contact', limiter);

// Email transporter configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.protonmail.ch',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'Piano Corner Studio Contact Server is running',
        timestamp: new Date().toISOString()
    });
});

// Keep-alive ping endpoint
app.get('/ping', (req, res) => {
    res.json({ 
        status: 'pong',
        timestamp: new Date().toISOString()
    });
});

// Piano lessons contact form endpoint
app.post('/contact', async (req, res) => {
    console.log('🎹 Piano lesson inquiry received:', req.body);
    
    try {
        const { 
            parentName, 
            email, 
            phone, 
            childName, 
            childAge, 
            lessonType, 
            message,
            timestamp 
        } = req.body;

        // Validation
        const requiredFields = { parentName, email, childAge, lessonType };
        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value || value.toString().trim() === '')
            .map(([key]) => key);

        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Invalid email format:', email);
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Age validation
        const age = parseInt(childAge);
        if (age < 5 || age > 14) {
            console.log('❌ Invalid age:', childAge);
            return res.status(400).json({
                success: false,
                error: 'Child age must be between 5 and 14'
            });
        }

        // Determine lesson pricing based on type
        const lessonPricing = {
            'Little Sprouts': '$30/30min',
            'Young Explorers': '$45/45min',
            'Rising Stars': '$60/hour',
            'Not sure yet': 'To be determined'
        };

        const pricing = lessonPricing[lessonType] || 'Custom pricing';

        // Prepare email content
        const emailSubject = `🎹 New Piano Lesson Inquiry - ${childName || 'Child'} (Age ${childAge})`;
        
        const emailHtml = `
            <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
                <div style="background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); color: white; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🎹 New Piano Lesson Inquiry</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                    <h2 style="color: #ff1493; margin: 0 0 25px 0; font-size: 22px; font-weight: 600; border-bottom: 2px solid #ff1493; padding-bottom: 10px;">👨‍👩‍👧‍👦 Family Information</h2>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #1a1a1a; display: inline-block; width: 140px;">Parent/Guardian:</strong>
                        <span style="color: #333;">${parentName}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #1a1a1a; display: inline-block; width: 140px;">Email:</strong>
                        <a href="mailto:${email}" style="color: #ff1493; text-decoration: none;">${email}</a>
                    </div>
                    
                    ${phone ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #1a1a1a; display: inline-block; width: 140px;">Phone:</strong>
                        <a href="tel:${phone}" style="color: #ff1493; text-decoration: none;">${phone}</a>
                    </div>` : ''}
                    
                    ${childName ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #1a1a1a; display: inline-block; width: 140px;">Child's Name:</strong>
                        <span style="color: #333;">${childName}</span>
                    </div>` : ''}
                    
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #1a1a1a; display: inline-block; width: 140px;">Child's Age:</strong>
                        <span style="color: #333; background: #ff1493; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 600;">${childAge} years old</span>
                    </div>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                    <h2 style="color: #ff1493; margin: 0 0 25px 0; font-size: 22px; font-weight: 600; border-bottom: 2px solid #ff1493; padding-bottom: 10px;">🎵 Lesson Details</h2>
                    
                    <div style="background: linear-gradient(135deg, rgba(255, 20, 147, 0.05) 0%, rgba(255, 105, 180, 0.05) 100%); padding: 20px; border-radius: 12px; border: 2px solid rgba(255, 20, 147, 0.1);">
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #1a1a1a; display: inline-block; width: 120px;">Lesson Type:</strong>
                            <span style="color: #ff1493; font-weight: 600; font-size: 18px;">${lessonType}</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #1a1a1a; display: inline-block; width: 120px;">Pricing:</strong>
                            <span style="color: #333; font-weight: 600;">${pricing}</span>
                        </div>
                        
                        ${lessonType === 'Not sure yet' ? `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-top: 15px;">
                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                <strong>📝 Note:</strong> Parent needs help choosing the right lesson type for their child.
                            </p>
                        </div>` : ''}
                    </div>
                </div>
                
                ${message ? `
                <div style="background: white; padding: 30px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                    <h2 style="color: #ff1493; margin: 0 0 20px 0; font-size: 22px; font-weight: 600; border-bottom: 2px solid #ff1493; padding-bottom: 10px;">💭 Parent's Message</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #ff1493;">
                        <p style="color: #333; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
                    </div>
                </div>` : ''}
                
                <div style="background: white; padding: 25px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                    <h3 style="color: #666; margin: 0 0 15px 0; font-size: 16px; font-weight: 500;">📊 Submission Details</h3>
                    
                    <div style="font-size: 14px; color: #666;">
                        <div style="margin-bottom: 8px;">
                            <strong>Submitted:</strong> 
                            <span>${timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <strong>Source:</strong> 
                            <span>Piano Corner Studio Website</span>
                        </div>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); color: white; padding: 25px; border-radius: 16px; text-align: center;">
                    <h3 style="margin: 0 0 15px 0; font-size: 20px;">🎹 Next Steps</h3>
                    <p style="margin: 0; font-size: 16px; line-height: 1.5;">
                        Reply to this email or call the parent to schedule their child's first lesson!<br>
                        <strong>Remember:</strong> First lesson special is just $20! 🌟
                    </p>
                </div>
                
                <div style="margin-top: 30px; text-align: center;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                        This inquiry was submitted through Piano Corner Studio contact form
                    </p>
                </div>
            </div>
        `;

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.PIANO_EMAIL || 'info@pianocorner.studio',
            subject: emailSubject,
            html: emailHtml,
            replyTo: email
        };

        await transporter.sendMail(mailOptions);
        
        console.log('✅ Piano lesson inquiry sent successfully');
        console.log(`   Parent: ${parentName}`);
        console.log(`   Email: ${email}`);
        console.log(`   Child: ${childName || 'Not provided'} (Age ${childAge})`);
        console.log(`   Lesson Type: ${lessonType}`);

        res.json({
            success: true,
            message: 'Your message has been sent successfully! We will get back to you soon to schedule your child\'s musical adventure.'
        });

    } catch (error) {
        console.error('❌ Error processing piano lesson inquiry:', error);
        res.status(500).json({
            success: false,
            error: 'Sorry, there was an error sending your message. Please try again or contact us directly.'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🎹 Piano Corner Studio Contact Server running on port ${PORT}`);
    console.log(`📧 Contact endpoint: POST /contact`);
    console.log(`🔍 Health check: GET /`);
    console.log(`📧 Emails will be sent to: ${process.env.PIANO_EMAIL}`);
});
