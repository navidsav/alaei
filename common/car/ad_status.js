// adStatusLoader.js
const config = require("../../config.json");
const mongo = require('@intugine-technologies/mongodb');
const mongodb = require("mongodb");

async function loadAdStatus() {
    try {
        const db = await mongo(config.DB_URI, config.MOBILE_DB_NAME);
        const agg = [];
        const packetsQuery = await db.aggregate("ad_status", agg);
        return packetsQuery.filter(status => status.value);
    } catch (e) {
        console.error({ event: 'ERROR CONNECTING TO MOBILE_DB_NAME', err: e?.message });
        return [];
    }
}

module.exports = { loadAdStatus };
