// api/make-call.js - Poora Twilio Integration Code
const twilio = require('twilio');

module.exports = async (req, res) => {
    // 1. CORS Headers allow karna taaki frontend se bina error call connect ho sake
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Browser ke Preflight (OPTIONS) request ko handle karne ke liye
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Sirf POST requests accept hongi
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { ownerPhone } = req.body;

    // Validation Check
    if (!ownerPhone) {
        return res.status(400).json({ success: false, error: 'Owner phone number missing!' });
    }

    // 2. Vercel Environment Variables se credentials uthana
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER; 

    // Secure Dashboard Connection Check
    if (!accountSid || !authToken || !twilioNumber) {
        return res.status(500).json({ 
            success: false, 
            error: 'Twilio setup parameters are missing in Vercel Environment Variables.' 
        });
    }

    const client = twilio(accountSid, authToken);

    try {
        // 3. Twilio Masked Call Trigger Framework
        const call = await client.calls.create({
            twiml: `<Response>
                        <Say voice="amber" language="en-IN">Connecting your secure call via Alerto Q R. Please wait while we mask your identity.</Say>
                        <Dial callerId="${twilioNumber}">${ownerPhone}</Dial>
                    </Response>`,
            to: ownerPhone, 
            from: twilioNumber 
        });

        // Response wapas bhejna agar call successfully trigger ho jaye
        return res.status(200).json({ success: true, callSid: call.sid });

    } catch (error) {
        console.error('Twilio Execution Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
