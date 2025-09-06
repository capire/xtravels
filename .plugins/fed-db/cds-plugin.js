const cds = require("@sap/cds");

const { isExternalEntity, time2Cron, time2Seconds } = require('./lib/utils.js');

const log = cds.log("db-federation");

const _hdi_migration = cds.compiler.to.hdi.migration;

cds.compiler.to.hdi.migration = function (csn, options, beforeImage) {
  const remoteEntities = [];
  const remoteSourcesUsed = new Set();
  const additions = [];
  const grants = {};

  // Add persistence.table and remove persistence.skip from external entities
  for (let [name, def] of Object.entries(csn.definitions)) {
    // Sync filenames for texts entities
    if (name.endsWith('.texts') && def.includes.includes('sap.common.TextsAspect')) name = name.replace('.texts', '_texts')
    if (!isExternalEntity(csn, def)) {
      // REVISIT: find out when the skip annotation is added
      delete def["@cds.persistence.skip"]
      // prevent prototype chain for the table annotation
      def["@cds.persistence.table"] = undefined;

      // Create cache views for entities with ttl
      if (def?.query && def['@cds.replicate.ttl'] && !Object.getPrototypeOf(def)['@cds.replicate.ttl']) {

        const retention = time2Seconds(def['@cds.replicate.ttl']);
        if (!retention) continue;

        additions.push({
          name,
          sql: `RESULT CACHE "_SYS_CACHE#${entry.name.replace(/\./g, '_')}"
                        ON VIEW "${entry.name.replace(/\./g, '_')}" WITH RETENTION ${retention}`,
          suffix: '.hdbresultcache'
        })
      }
      // Skip non-external entities
      continue;
    }

    delete def["@cds.persistence.skip"];
    def["@cds.persistence.table"] = true;

    const srvName = csn.services.find(srv => name.indexOf(srv.name) === 0)?.name;
    remoteSourcesUsed.add(srvName);
    const remote = cds.env.requires[srvName];
    if (!remote || !(remote.credentials?.remote || remote.vcap)) {
      // Mocking: Create .hdtable for remote tables
      continue;
    }

    const creds = remote.credentials ?? {}

    // Use quoted mode names when in quoted mode
    const localQuoted = cds.env?.sql?.names === 'quoted'
    const remoteQuoted = creds.sql?.names === 'quoted'
    const removeService = creds.service === false

    const database = creds.database || '<NULL>';
    const schema = creds.schema || '<NULL>';
    const reduceName = removeService ? name.replace(srvName + '.', '') : name
    const remoteEntityName = remoteQuoted ? reduceName : reduceName.replace(/\./g, '_').toUpperCase()
    const localEntityName = localQuoted ? `"${name}"` : name.replace(/\./g, '_').toUpperCase()

    let srcEntityName = localEntityName;

    if (remoteQuoted && !localQuoted) {
      srcEntityName = `${localEntityName}_SRC`
      additions.push({
        name,
        suffix: '.hdbview',
        sql: `VIEW ${localEntityName} AS SELECT
  ${Object.keys(def.elements)
            .filter(e => !def.elements[e]?.virtual && !(def.elements[e]?.isAssociation && !def.elements[e].keys) && !def.elements[e]?.elements)
            .map(e => {
              if (def.elements[e]?.isAssociation) {
                return def.elements[e].keys.map(k => {
                  e = `${e}_${k.ref[0]}`
                  return `"${e}" AS ${e}`
                })
              }
              return `"${e}" AS ${e}`
            })
            .flat()
            .join(',\n  ')
          }
FROM ${srcEntityName}`,
      })
    }

    // Use synonyms when no remote is specified
    if (!creds.remote) {
      const service = remote.vcap?.name || remote.vcap
      additions.push({
        name,
        suffix: '.hdbsynonym',
        sql: JSON.stringify({
          [srcEntityName]: {
            target: {
              object: remoteEntityName,
              schema: creds.schema,
            }
          }
        }),
      })

      // additions.push({
      //   name: '../cfg/' + name, // .hdbsynonymconfig files don't work properly unless put inside the cfg dir "invalid xpath [8258506]"
      //   suffix: '.hdbsynonymconfig',
      //   sql: JSON.stringify({
      //     [remoteEntityName]: {
      //       target: {
      //         object: remoteEntityName,
      //         "*.configure": service,
      //       }
      //     }
      //   }),
      // });

      // Only OO grant role is required as it can grant SELECT to the application user
      if (creds.type === 'procedure') { // Indicates procedure based granting object level privileges based
        grants[service] ??= {
          object_owner: {
            roles: [],
            container_roles: [],
            object_privileges: [],
          }
        }
        grants[service].object_owner.object_privileges.push({
          type: 'VIEW',
          name: remoteEntityName,
          privileges_with_grant_option: [
            "SELECT"
          ]
        })
      } else { // Default is HDI binding granting which only allows roles
        grants[service] ??= {
          object_owner: { schema_roles: ['PUBLIC#'] },
          // application_user: { schema_roles: ['PUBLIC'] }, // REVISIT: keep the application user role or rely on #OO grants ?
        }
      }
    }
    // Use hana virtual tables
    else if (creds.remote) {
      additions.push({
        name,
        suffix: '.hdbvirtualtable',
        sql: `VIRTUAL TABLE ${srcEntityName} AT "${creds.remote}"."${database}"."${schema}"."${remoteEntityName}"`,
      })

      // Entity names provided in the role are case sensitive even when the definition is not quoted
      remoteEntities.push(localQuoted ? name : localEntityName.toUpperCase());

      if (typeof def['@cds.replicate.ttl'] === 'string') {
        const time = time2Cron(def['@cds.replicate.ttl']);

        if (!time) continue

        // Create snapshot replica with manual refresh
        additions.push({
          name,
          sql: `SHARED SNAPSHOT REPLICA ON ${srcEntityName}`,
          suffix: '.hdbfabricvirtualtable'
        });

        // Create procedure and job schedular to refresh snapshot
        const procedureName = localEntityName + '_procedure';
        additions.push({
          name,
          sql:
            `PROCEDURE ${procedureName}
LANGUAGE SQLSCRIPT 
SQL SECURITY DEFINER
AUTOCOMMIT DDL ON
AS BEGIN
  EXEC 'ALTER VIRTUAL TABLE ${srcEntityName} REFRESH SNAPSHOT REPLICA ASYNC';
END`,
          suffix: '.hdbprocedure'
        });

        additions.push({
          name,
          sql: `SCHEDULER JOB ${remoteEntityName + 'SCHEDULAR_JOB'} CRON '${time}' ENABLE PROCEDURE ${procedureName}`,
          suffix: '.hdbschedulerjob'
        });
      } else if (creds.supportRealTimeCDC && def['@cds.replicate'] && !def.query) {
        additions.push({
          name,
          sql: `SHARED REPLICA ON ${srcEntityName}`,
          suffix: '.hdbfabricvirtualtable'
        });
        continue;
      }
    }
  }

  const ret = _hdi_migration(csn, options, beforeImage);

  // create roles for synonyms
  const appRole = {
    name: 'application',
    suffix: '.hdbrole',
    sql: {
      role: {
        name: 'application',
      }
    }
  }

  if (Object.keys(grants).length) {
    additions.push({
      name: '',
      suffix: '.hdbgrants',
      sql: JSON.stringify(grants, null, 2)
    })
  }

  if (remoteEntities.length) {
    appRole.sql.role.object_privileges = remoteEntities.map(name => ({ name, type: "TABLE", privileges: ["SELECT"] }))
  }

  appRole.sql = JSON.stringify(appRole.sql, null, 2)
  additions.push(appRole)

  ret.definitions = [...ret.definitions.filter(e => !additions.some(a => a.name === e.name)), ...additions];
  return ret;
}
