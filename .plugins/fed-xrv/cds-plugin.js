// Temporary monkey patch till cds 9.3 is publically available
const { LinkedCSN } = require('@sap/cds').linked
LinkedCSN.prototype.collect ??= function (picker, collector) {
  if (!collector) collector = picker, picker = () => true
  let d, x, collected = []
  for (d of this.definitions)
    if (picker(d) && (x = collector(d)) !== undefined) collected.push (x)
  return collected
}

module.exports = require ('./lib/federation-service') .bootstrap()
