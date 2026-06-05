const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cefzsgchfdvtyfmcrsda.supabase.co";
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnpzZ2NoZmR2dHlmbWNyc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTU5NTgsImV4cCI6MjA5NDQzMTk1OH0.JhuJVKqX6xMbWQ7bmsraY3DjVKbsXMNzl0h6ljePTxs";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async (req, res) => {
    // SMSCountry ko aawaz aur call forward karne ke liye XML format chahiye hota hai
    res.setHeader('Content-Type', 'text/xml');

    try {
        // Testing ke liye humne ek QR Code ID fix kar di hai
        const TEST_STICKER_ID = 'ALQR1003';

        // Database se ALQR1003 wale ka mobile number nikal rahe hain
        const { data, error } = await supabase.from('registrations').select('mobile_number').eq('sticker_id', TEST_STICKER_ID).single();

        if (error || !data || !data.mobile_number) {
            return res.status(200).send(`<Response><Play>Sorry, vehicle owner is not registered.</Play></Response>`);
        }

        let ownerCleanNumber = data.mobile_number.toString().replace(/[^0-9]/g, '');
        if (ownerCleanNumber.startsWith('0')) ownerCleanNumber = ownerCleanNumber.substring(1);
        if (!ownerCleanNumber.startsWith('91')) ownerCleanNumber = `91${ownerCleanNumber}`;

        // Ye line SMSCountry ko bolegi: "Call owner ke number par forward kar do"
        const xmlResponse = `
            <Response>
                <Play>Please wait, Alerto QR is connecting you to the vehicle owner.</Play>
                <Dial>${ownerCleanNumber}</Dial>
            </Response>
        `;
        return res.status(200).send(xmlResponse);

    } catch (err) {
        return res.status(200).send(`<Response><Play>System error occurred.</Play></Response>`);
    }
};
