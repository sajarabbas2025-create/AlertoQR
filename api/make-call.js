// Vercel Serverless Function - Twilio Number Masking Integration
const twilio = require('twilio');

module.exports = async (req, res) => {
    // CORS aur Preflight Requests (OPTIONS) ko handle karne ke liye headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Agar browser pehle check karne ke liye OPTIONS request bheje
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Sirf POST request ko allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { ownerPhone } = req.body;

    if (!ownerPhone) {
        return res.status(400).json({ success: false, error: 'Owner phone number missing!' });
    }

    // Twilio Credentials (Ye Vercel Environment Variables se aayenge)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER; 

    // Server end par secure verification check
    if (!accountSid || !authToken || !twilioNumber) {
        return res.status(500).json({ 
            success: false, 
            error: 'Twilio setup parameters are missing in Vercel Environment Variables.' 
        });
    }

    const client = twilio(accountSid, authToken);

    try {
        // 1. Twilio Voice Call Trigger: Pehle AlertoQR System Helper (jisne scan kiya) ko call milayega
        // Kyunki hum abhi browser se test kar rahe hain, Twilio pehle aapko call karega, fir forward karega.
        const call = await client.calls.create({
            // TwiML Bin / Dynamic Response Instruction
            twiml: `<Response>
                        <Say voice="amber" language="en-IN">Connecting your secure call via Alerto Q R. Please wait while we mask your identity.</Say>
                        <Dial callerId="${twilioNumber}">${ownerPhone}</Dial>
                    </Response>`,
            to: ownerPhone, // Helper/Scanner ka phone ya direct testing ke liye Owner Phone
            from: twilioNumber // Aapka khareeda hua Twilio Masked Number
        });

        return res.status(200).json({ success: true, callSid: call.sid });

    } catch (error) {
        console.error('Twilio Execution Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
