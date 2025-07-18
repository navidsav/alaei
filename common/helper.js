

module.exports = {
    diffNumberProperties: (obj1, obj2) => {
        const diff = {};

        for (const key in obj1) {
            if (typeof obj1[key] === 'number') {
                diff[key] = (obj1[key] || 0) - (obj2[key] || 0);
            }
        }

        for (const key in obj2) {
            if (typeof obj2[key] === 'number' && !obj1.hasOwnProperty(key)) {
                diff[key] = 0 - (obj2[key] || 0);
            }
        }

        return diff;
    }
}