export default async function handler(req, res) {
    // 1. Request se Sticker ID nikalna (GET ya POST dono ke liye)
    const stickerId = (req.query.stickerId || req.body.stickerId || "").trim().toUpperCase();

    if (!stickerId) {
        return res.status(400).send("<Response><Say>Invalid Sticker ID</Say></Response>");
    }

    try {
        // 2. Firebase Firestore REST API se direct data fetch karna (No NPM packages needed!)
        const projectId = "alertoqr";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stickers/${stickerId}`;

        const dbResponse = await fetch(firestoreUrl);

        // Agar database mein sticker nahi mila
        if (!dbResponse.ok) {
            console.log(`Sticker ${stickerId} not found in Firebase.`);
            return res.status(200).send(
                `<Response><Say>This sticker is not registered yet. Please register first.</Say></Response>`
            );
        }

        const docData = await dbResponse.json();

        // 3. Document se Mobile Number nikalna
        // Firebase REST API ka response format: docData.fields.mobileNumber.stringValue
        const rawMobile = docData.fields?.mobileNumber?.stringValue;
        const vehicleNumber = docData.fields?.vehicleNumber?.stringValue || "Vehicle";

        if (!rawMobile) {
            return res.status(200).send(
                `<Response><Say>Owner contact details are missing.</Say></Response>`
            );
        }

        // Phone number format sahi karna (Ensure it has country code for call routing)
        let cleanPhone = rawMobile.replace(/\D/g, ''); // Sirf digits rakhna
        if (cleanPhone.length === 10) {
            cleanPhone = "91" + cleanPhone; // Default Indian country code add karna
        }

        // 4. Call Masking Response Generate Karna (XML Format)
        // Note: Sajar, aapka call provider (Twilio/Exotel) jo bhi format ya voice chahta hai, use niche XML mein customize kar sakte hain.
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-IN">Connecting your call securely to the owner of vehicle ${vehicleNumber.split('').join(' ')}.</Say>
    <Dial callerId="+91XXXXXXXXXX">${cleanPhone}</Dial>
</Response>`);

    } catch (error) {
        console.error("Error in incoming-call api:", error);
        res.setHeader('Content-Type', 'text/xml');
        return res.status(500).send(
            `<Response><Say>System error. Please try again later.</Say></Response>`
        );
    }
}
