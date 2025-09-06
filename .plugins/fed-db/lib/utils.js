function isExternalEntity(model, entry) {
    const remoteServices = Object.keys(model.definitions)
        .filter(name => model.definitions[name]?.kind === 'service' && model.definitions[name]['@cds.external'])
    return entry && entry.kind === "entity" &&
        remoteServices.some(srv => entry.name.indexOf(srv) === 0)
}

const hanaCronRegex = new RegExp('^' + new Array(7).fill(`(\\d+|\\*)`).join(' +') + '$');
/** 
 * <cron> ::= { <year> | <month> | <date> | <weekday> | <hour> | <minute> | <seconds> }
 * @param {*} time 
 * @returns {string | null}
 */
function time2Cron(time) {
    time = time.trim();
    if (hanaCronRegex.test(time)) {
        return time;
    }

    const match = time.match(/^([0-9]+)(w|d|h|hrs|m|min|s)$/);
    if (!match) return;

    let cronParts = ['*', '*', '*', '*', '*', '*', '*'];

    const [, val, t] = match
    switch (t) {
        case 'w':
            cronParts[2] = `*/${val * 7}`;
            cronParts[3] = '0';
            cronParts[4] = '0';
            cronParts[5] = '0';
            cronParts[6] = '0';
            break;
        case 'd':
            cronParts[2] = `*/${val}`;
            cronParts[3] = '0';
            cronParts[4] = '0';
            cronParts[5] = '0';
            cronParts[6] = '0';
            break;
        case 'h':
        case 'hrs':
            cronParts[4] = `*/${val}`;
            cronParts[5] = '0';
            cronParts[6] = '0';
            break;
        case 'm':
        case 'min':
            cronParts[5] = `*/${val}`;
            cronParts[6] = '0';
            break;
        case 's':
            cronParts[6] = `*/${val}`;
            break;
    }

    return cronParts.join(' ');
}

function time2Seconds(time) {
    time = time.trim();
    const match = time.match(/^([0-9]+)(w|d|h|hrs|min|s)$/);
    if (!match) return;

    const [, val, t] = match
    switch (t) {
        case 'w': return val * 7 * 24 * 60 * 60;
        case 'd': return val * 24 * 60 * 60;
        case 'h':
        case 'hrs': return val * 60 * 60;
        case 'min': return val * 60;
        case 's': return val;
    }
}

module.exports = {
    isExternalEntity,
    time2Cron,
    time2Seconds
};
