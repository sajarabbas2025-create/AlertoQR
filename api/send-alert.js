const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SMSCountry REST API Credentials
const SMSCOUNTRY_AUTH_KEY = "VjML4PrM2o7xqOELaQuD";
const SMSCOUNTRY_AUTH_TOKEN = "W3DUky5OlRoevogUDqkwLps8rkHNqwWy0QalAVJl";

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
            // 1. Supabase se profile fetch karna
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('sticker_id', stickerId.trim().toUpperCase())
                .single();

            if (error || !data) {
                return res.status(200).json({ success: false, error: 'Sticker ID not found in database.' });
            }

            let targetPhone = (mode === 'alternate') ? data.alternate_number : data.mobile_number;
            if (!targetPhone) {
                return res.status(200).json({ success: false, error: 'Vehicle owner phone number missing.' });
            }

            // 🛠️ EXTRA CLEANING LOGIC FOR 'TO' NUMBER
            let ownerPhoneClean = targetPhone.toString().replace(/[^0-9]/g, ''); // Sirf numbers bachenge
            
            // Agar suru mein 0 hai toh hatao
            if (ownerPhoneClean.startsWith('0')) {
                ownerPhoneClean = ownerPhoneClean.substring(1);
            }
            // Agar double 91 lag gaya ho (jaise 9191xxxx) toh sahi karo
            if (ownerPhoneClean.startsWith('9191') && ownerPhoneClean.length === 12) {
                ownerPhoneClean = ownerPhoneClean.substring(2);
            }
            // Aakhiri mein ensure karo ki sirf ek baar 91 ho 10 digit ke aage
            if (ownerPhoneClean.length === 10) {
                ownerPhoneClean = `91${ownerPhoneClean}`;
            }

            // 📞 ROUTE A: CALLING ENGINE (SMSCountry RestAPI)
            if (mode === 'call' || mode === 'alternate') {
                const callApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/Calls/`;
                const authHeader = Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');

                // 🛠️ Dhyan dein: Agar SMSCountry 'From' parameter mein virtual number mangta hai, 
                // toh use bina '91' ke ya bina '+' ke bhejna pad sakta hai. Hum use clean 10-12 digit format de rahe hain.
                let fromNumber = "919703826178"; 

                const params = new URLSearchParams();
                params.append('From', fromNumber); 
                params.append('To', ownerPhoneClean);  
                params.append('Type', 'bridge');

                try {
                    const apiResponse = await axios.post(callApiUrl, params, {
                        headers: {
                            'Authorization': `Basic ${authHeader}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                    return res.status(200).json({ success: true, message: 'Call Request Dispatched.', data: apiResponse.data });
                } catch (apiErr) {
                    const errorMsg = apiErr.response ? JSON.stringify(apiErr.response.data) : apiErr.message;
                    return res.status(200).json({ success: false, error: `SMSCountry Call Error: ${apiErr.response ? apiErr.response.status : '500'} - ${errorMsg}` });
                }
            } 
            
            // 💬 ROUTE B: SMS ENGINE (SMSCountry SMS Endpoint)
            else {
                const smsApiUrl = `https://restapi.smscountry.com/v0.1/Accounts/${SMSCOUNTRY_AUTH_KEY}/SMSes/`;
                const formattedMsg = `[AlertoQR] Emergency Alert! Vehicle (${data.vehicle_number || 'Vehicle'}) par alert: "${alertType}". Kripya check karein!`;
                
                const authHeader = Buffer.from(`${SMSCOUNTRY_AUTH_KEY}:${SMSCOUNTRY_AUTH_TOKEN}`).toString('base64');
                
                const params = new URLSearchParams();
                params.append('Text', formattedMsg);
                params.append('To', ownerPhoneClean);
                params.append('SenderId', 'ALERTO'); // Aapka approved Sender ID

                try {
                    await axios.post(smsApiUrl, params, {
                        headers: {
                            'Authorization': `Basic ${authHeader}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                    return res.status(200).json({ success: true, mode: 'sms' });
                } catch (smsErr) {
                    const errorMsg = smsErr.response ? JSON.stringify(smsErr.response.data) : smsErr.message;
                    return res.status(200).json({ success: false, error: `SMSCountry SMS Error: ${errorMsg}` });
                }
            }

        } catch (err) {
            return res.status(200).json({ success: false, error: `Server System Exception: ${err.message}` });
        }
    }
};
