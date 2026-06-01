const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_ID = process.env.BULK_SMS_API_ID;
const API_PASSWORD = process.env.BULK_SMS_API_PASSWORD;
const IVR_NUMBER = "1732361210"; // Aapka virtual number bina code ke

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 📞 BULK SMS PLANS INBOUND IVR HANDSHAKE BYPASS
    if (req.method === 'GET' || (req.method === 'POST' && !req.body.alertType)) {
        const incomingStickerId = req.query.stickerId || req.body.stickerId || req.query.did || "";
        
        if (incomingStickerId) {
            try {
                const { data, error } = await supabase
                    .from('registrations')
                    .select('mobile_number')
                    .eq('sticker_id', incomingStickerId.trim().toUpperCase())
                    .single();

                if (!error && data && data.mobile_number) {
                    let cleanPhone = data.mobile_number.toString().replace(/[^0-9]/g, '');
                    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
                        cleanPhone = cleanPhone.substring(2);
                    }
                    return res.status(200).json({ data: cleanPhone });
                }
            } catch (e) {
                console.log("IVR fallback logic error");
            }
        }
        // Fallback testing default response as required format {"data":"NUMBER"}
        return res.status(200).json({ data: "9254021578" });
    }

    // 💬 FRONTEND APP TIMELY PROTOCOL (POST)
    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID not found.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Target phone not found.' });
            }

            let customerPhone = targetPhone.toString().replace(/[^0-9]/g, '');
            if (customerPhone.startsWith('91') && customerPhone.length > 10) {
                customerPhone = customerPhone.substring(2);
            }

            // 📞 ACTIVE OUTBOUND CALL BRIDGE VIA DOCUMENTATION SPECIFICATIONS
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://bulksmsplans.com/api/ivr/makeACall`;
                
                // Hum background me click-to-call trigger kar rahe hain jo dono ko jodd dega
                axios.get(callApiUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        ivr_number: IVR_NUMBER,
                        dial: 'Customer',
                        receiver_number: '9254021578', // Testing default helper container flow number
                        agent_number: customerPhone    // Dynamic registered vehicle owner number
                    }
                }).catch(e => console.log("Outbound Bridge Sync Bypass"));

                return res.status(200).json({ success: true, mode: 'call', virtualNumber: '+911732361210' });
            } 
            
            // 💬 SMS ROUTE PROTOCOL
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                axios.get(gatewayUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        sms_type: 'Transactional',
                        sms_encoding: 'text',
                        sender: 'BLKSM5',
                        number: customerPhone,
                        message: smsMessage
                    }
                }).catch(e => console.log("SMS Gateway bypass"));

                return res.status(200).json({ success: true, mode: 'sms' });
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: err.message });
        }
    }
};
