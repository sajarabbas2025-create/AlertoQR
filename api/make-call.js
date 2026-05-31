const twilio = require('twilio');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Aapke Vercel dashboard ke mutabik variables ko map kiya
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER; // Yahan dhyan dein: PHONE_NUMBER kar diya hai

    const { ownerPhone } = req.body;

    if (!accountSid || !authToken || !twilioNumber) {
        return res.status(500).json({ success: false, error: 'Twilio Credentials missing in Vercel configuration.' });
    }

    if (!ownerPhone) {
        return res.status(400).json({ success: false, error: 'Missing owner phone number' });
    }

    const client = twilio(accountSid, authToken);

    try {
        // Yeh line seedhe vehicle owner ko phone lagayegi
        const call = await client.calls.create({
            twiml: `<Response><Say voice="alice">Hello, someone is near your vehicle and trying to contact you. Connecting you now.</Say><Dial>${ownerPhone}</Dial></Response>`,
            to: ownerPhone,
            from: twilioNumber
        });

        return res.status(200).json({ success: true, callSid: call.sid });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
