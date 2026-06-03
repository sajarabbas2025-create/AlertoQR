const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SMSCountry Dynamic API Credentials
const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";

module.exports = async (req, res) => {
    // CORS Headers Settings
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            // 1. Supabase se registration record fetch karna
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
                return res.status(200).json({ success: false, error: 'Owner phone missing.' });
            }

            // Vehicle Owner ka number saaf karke international format (91) banana
            let ownerPhoneClean = targetPhone.toString().replace(/[^0-9]/g, '');
            if (ownerPhoneClean.length === 10) {
                ownerPhoneClean = `91${ownerPhoneClean}`;
            } else if (ownerPhoneClean.startsWith('91') && ownerPhoneClean.length > 12) {
                ownerPhoneClean = ownerPhoneClean.substring(ownerPhoneClean.length - 12);
            }

            // 📞 SMSCOUNTRY BRIDGE CALL ROUTING
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://api.smscountry.com/v1/Accounts/Voice/Calls.json`;
                
                // Base64 Authorization Header Encryption
                const authHeader = Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

                // ⚠️ TESTING PAYLOAD: 'From' aur 'To' dono numbers alag hone zaroori hain
                // Note: Jab automatic dedicated virtual number mil jayega, tab helper ka real number yahan dynamic aayega.
                const payload = {
                    From: "916387947607",   // 📞 Testing ke liye temporary doosra number (Jaise Balakrishna ji ka number ya apna koi doosra number)
                    To: ownerPhoneClean,     // 🚗 Yeh gaadi ke owner ka real number rahega jo Supabase se aaya hai
                    Type: "bridge"
                };

                // SMSCountry API ko request bhejrahe hain
                const apiResponse = await axios.post(callApiUrl, payload, {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log("SMSCountry Success Response:", apiResponse.data);
                return res.status(200).json({ success: true, message: 'SMSCountry Bridge Initiated Successfully.' });
            } 
            
            // 💬 SMS PROTOCOL (Purana working transactional SMS)
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
                const gatewayUrl = `https://bulksmsplans.com/api/send-sms`;
                
                let smsTarget = ownerPhoneClean;
                if (smsTarget.startsWith('91')) {
                    smsTarget = smsTarget.substring(2); 
                }

                await axios.get(gatewayUrl, {
                    params: {
                        api_id: "API42znmxVL150879", 
                        api_password: "ND7oMLCE",
                        sms_type: 'Transactional',
                        sms_encoding: 'text',
                        sender: 'BLKSM5',
                        number: smsTarget,
                        message: smsMessage
                    }
                });

                return res.status(200).json({ success: true, mode: 'sms' });
            }

        } catch (err) {
            console.error("Backend Main Error Log:", err.response ? err.response.data : err.message);
            // Frontend ko clear message bhejenge agar backend pe fail hota hai
            return res.status(500).json({ success: false, error: err.message });
        }
    }
};
