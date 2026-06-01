const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bulk SMS Plans API Credentials
const API_ID = process.env.BULK_SMS_API_ID || "API42znmxVL150879";
const API_PASSWORD = process.env.BULK_SMS_API_PASSWORD || "ND7oMLCE";
const IVR_NUMBER = "1732361210"; 

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const { stickerId, alertType, mode } = req.body;

        try {
            // Supabase se customer ka number nikalna
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

            let customerPhone = targetPhone.toString().replace(/[^0-9]/g, '');
            if (customerPhone.startsWith('91') && customerPhone.length > 10) {
                customerPhone = customerPhone.substring(2);
            }

            // 📞 NEW OUTBOUND CLICK-TO-CALL ROUTING
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://bulksmsplans.com/api/ivr/makeACall`;
                
                // Kyunki 'Receiver Number' dynamic type ho sakta hai, hum customerPhone ko receiver banayenge!
                axios.get(callApiUrl, {
                    params: {
                        api_id: API_ID,
                        api_password: API_PASSWORD,
                        ivr_number: IVR_NUMBER,
                        dial: 'Receiver',          // Ab target priority Receiver hai
                        receiver_number: customerPhone, // Gadi owner ka number dynamic chala gaya
                        agent_number: '9254021578'     // Aapka static admin/desk number
                    }
                })
                .then(response => console.log("Call requested successfully:", response.data))
                .catch(e => console.log("API Error:", e.message));

                return res.status(200).json({ success: true, message: 'Bridge active.' });
            } 
            
            // 💬 SMS PROTOCOL
            else {
                const smsMessage = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
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
                }).catch(e => console.log("SMS Error"));

                return res.status(200).json({ success: true, mode: 'sms' });
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: err.message });
        }
    }
};
