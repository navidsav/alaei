// adStatusLoader.js
const config = require("../../config.json");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");

async function loadBodyStatus() {
    try {
        const db = await mongo(config.DB_URI, config.MOBILE_DB_NAME);
        const agg = [];
        const packetsQuery = await db.aggregate("body_status", agg);
        return packetsQuery;
    } catch (e) {
        console.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message });
        return [];
    }
}

module.exports = { loadBodyStatus };

