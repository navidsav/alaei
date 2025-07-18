const MelipayamakApi = require('melipayamak')
const username = '9198652818';
const password = 'Anad@1400';
const bodyId = '74012'
const api = new MelipayamakApi(username,password);
const sms = api.sms();

sms.sendByBaseNumber(904071, 'to', bodyId);