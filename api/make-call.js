const twilio = require('twilio');

export default async function handler(req, res) {
    // CORS Headers enable karna zaroori hai
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { ownerPhone } = req.body;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
        const call = await client.calls.create({
            twiml: `<Response><Say>Connecting to vehicle owner.</Say><Dial>${ownerPhone}</Dial></Response>`,
            to: ownerPhone,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        return res.status(200).json({ success: true, sid: call.sid });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
