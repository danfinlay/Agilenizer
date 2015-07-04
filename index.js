var Identity = require('./lib/identity')

module.exports = new Agilenizer()

function Agilenizer () {

}

Agilenizer.prototype.newIdentity = function (opts) {
  return new Identity(opts)
}
