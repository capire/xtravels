const cds = require ('@sap/cds')
const log = cds.log ('cds.data')

/**
 * The Data Federation Service handles all federation-related tasks.
 * Implementing this as a CAP service allows for seamless usage of event
 * queues, as well as for others to add event handlers.
 */
module.exports = class DataFederationService extends cds.Service {

  static bootstrap() { return this.bootstrapped ??= cds.on ('loaded', csn => {

    const federated = e => e.is_entity && e['@federated']
    const todos = cds.linked(csn).collect (federated, entity => {
      let source = entity.source          // the external source entity
      let srv = source.service            // the external service
      let conf = cds.requires[srv?.name]  // the service's binding point
      if (!conf?.credentials) return      // not bound to remote, skipping
      entity['@cds.persistence.table'] = true
      entity['@cds.persistence.skip'] = false
      return { entity: entity.name, from: srv.name }
    })
    if (!todos.length) return

    cds.once ('served', async () => {
      const dfs = await cds.connect.to (DataFederationService)
      return Promise.all (todos.map (todo => dfs.replicate (todo)))
    })

  })}

  init() {
    this.on ('initial-load', async req => {
      const { entity, from: remote } = req.data
      const srv = await cds.connect.to (remote)
      const rows = await srv.read (entity) // @Bob: can we stream this?
      await INSERT.into(entity).entries(rows)
      log.info ('initially loaded:', { entity, from: remote, via: srv.kind })
    })
  }

  replicate ({ entity, from: remote }) {
    return this.schedule ('initial-load', { entity, from: remote })
      .after ('11ms')
  }
}


//
// Temporary monkey patches till upcoming cds release
//

cds.extend (cds.entity) .with (class {
  get service(){ return this._service }
  get source(){ return this.query && this.__proto__ }
})
