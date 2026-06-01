const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bulk SMS Plans API Credentials
const API_ID = process.env.BULK_SMS_API_ID || "API42znmxVL150879";
const API_PASSWORD = process.env.BULK_SMS_API_PASSWORD || "ND7oMLCE";
const IVR_NUMBER = "1732361210"; // Aapka virtual number bina kisi prefix ke

module.exports = async (req, res) => {
    // CORS Headers Settings
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 💬 FRONTEND APP PROTOCOL (POST) - Jab web portal se request aayegi
    if (req.method === 'POST') {
        const { stickerId, alertType, mode, isDirectCall, helperPhone } = req.body;

        try {
            // 1. Supabase se registration data fetch karein
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID not found in Supabase.' });
            }

            // Target number select karein (Primary ya Alternate)
            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Owner phone number missing.' });
            }

            // Customer number ko clean karein (bina 91 ke 10 digits)
            let customerPhone = targetPhone.toString().replace(/[^0-9]/g, '');
            if (customerPhone.startsWith('91') && customerPhone.length > 10) {
                customerPhone = customerPhone.substring(2);
            }

            // 📞 DIRECT CLICK-TO-CALL ROUTE (Bina helper se kuch dial karvaye)
            if (isDirectCall || mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://bulksmsplans.com/api/ivr/makeACall`;
                
                // Helper ka number agar frontend se aaya hai toh use karein, nahi toh default testing number
                let cleanHelperPhone = (helperPhone) ? helperPhone.toString().replace(/[^0-9]/g, '') : "9254021578";
                if (cleanHelperPhone.startsWith('91') && cleanHelperPhone.length > 10) {
                    cleanHelperPhone = cleanHelperPhone.substring(2);
                }

                // API Documents ke exact parameters hit ho rahe hain
                axios.get(callApiUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        ivr_number: IVR_NUMBER,
                        dial: 'Customer',
                        receiver_number: cleanHelperPhone, // Jo call kar raha hai (Helper)
                        agent_number: customerPhone       // Jiske paas call jani hai (Vehicle Owner)
                    }
                })
                .then(response => console.log("Call bridge successfully requested:", response.data))
                .catch(e => console.log("Outbound Call Bridge Error:", e.message));

                return res.status(200).json({ success: true, message: 'Click-to-call session initiated successfully.' });
            } 
            
            // 💬 SMS ROUTE PROTOCOL
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Aapki vehicle (${data.vehicle_number || 'Vehicle'}) par ek notification aaya hai: "${alertType}". Kripya check karein!`;
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
                }).catch(e => console.log("SMS Gateway bypass error"));

                return res.status(200).json({ success: true, mode: 'sms' });
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: err.message });
        }
    }

    // Fallback GET request handle karne ke liye
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ status: "Server is alive", data: "9254021578" });
    }
};
