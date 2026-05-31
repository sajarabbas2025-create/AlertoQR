const twilio = require('twilio');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_NUMBER; 

    const { ownerPhone } = req.body;

    if (!accountSid || !authToken || !twilioNumber) {
        return res.status(500).json({ 
            success: false, 
            error: "Vercel configuration missing credentials." 
        });
    }

    if (!ownerPhone) {
        return res.status(400).json({ success: false, error: 'Missing owner phone number' });
    }

    let formattedOwnerPhone = ownerPhone.trim();
    if (!formattedOwnerPhone.startsWith('+')) { formattedOwnerPhone = '+' + formattedOwnerPhone; }

    let formattedTwilioNumber = twilioNumber.trim();
    if (!formattedTwilioNumber.startsWith('+')) { formattedTwilioNumber = '+' + formattedTwilioNumber; }

    const client = twilio(accountSid, authToken);

    try {
        const call = await client.calls.create({
            twiml: `<Response><Say voice="alice">Hello, someone is near your vehicle and trying to contact you. Connecting you now.</Say><Dial>${formattedOwnerPhone}</Dial></Response>`,
            to: formattedOwnerPhone,
            from: formattedTwilioNumber
        });
        return res.status(200).json({ success: true, callSid: call.sid });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Twilio Error: " + error.message });
    }
}
