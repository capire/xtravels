const cds = require ('@sap/cds')
const log = cds.log ('cds.data')


cds.on ('loaded', csn => {

    const todos = []
    for (let each of cds.linked(csn).definitions) {
      
      // only entities tagged with @federated:true or @federated:'initial-load'
      let fed = each.is_entity && each['@federated']
      if (!fed || fed !== 'initial-load' && fed !== true) continue

      // only bound services
      let srv = each.source?.service
      let conf = cds.requires[srv?.name]      
      if (!conf?.credentials?.url) continue

      // only if default federation config matches
      if (fed === true && (
        conf.federation?.[each.name] || 
        conf.federation?.default ||
        cds.env.federation?.default
      ) !== 'initial-load') continue


      // use consumption view as table for replication
      each['@cds.persistence.table'] = true
      todos.push ({ entity: each.name, from: srv.name })
    }
    if (!todos.length) return // nothing to do
    
    cds.once ('served', async () => {
      const dfs = await cds.connect.to (DataFederationService)
      return Promise.all (todos.map (
        todo => dfs.schedule ('initial-load', todo)
        // .after ('1 second') // for testing only
      ))
    })
})

/**
 * The Data Federation Service handles all federation-related tasks.
 * Implementing this as a CAP service allows for seamless usage of event
 * queues, as well as for others to add event handlers.
 */
class DataFederationService extends cds.Service { init() {

  this.on ('initial-load', async req => {
    const { entity, from: remote } = req.data
    const srv = await cds.connect.to (remote)
    const rows = await srv.read (entity) // @Bob: can we stream this?
    await cds.insert(rows).into (entity)
    log.info ('initially loaded', rows.length, 'rows for:', { entity, from: remote, via: srv.kind })
  })

}}


//
// Temporary monkey patches till upcoming cds release
//

cds.extend (cds.entity) .with (class {
  get service(){ return this._service }
  get source(){ return this.query && this.__proto__ }
})
