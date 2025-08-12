import fs from 'node:fs'
import cp from 'node:child_process'
import cds from '@sap/cds'

const database = 'xflights'
const credentials = {
  "user": "SYSTEM",
  "password": "Manager1",
  "host": "localhost",
  "port": "30041",
  "useTLS": true,
  "encrypt": true,
  "sslValidateCertificate": false,
  "rejectUnauthorized": false,
  "disableCloudRedirect": true,
  "driver": "hdb"
}

console.log('HDI setup')
const [travels, xflights] = await Promise.all(
  [
    hdiContainer({ database, tenant: 'travels' }),
    hdiContainer({ database, tenant: 'xflights' }),
  ]
)

const xtravelsDir = cds.utils.path.resolve(import.meta.dirname + '/../')
const xflightsDir = cds.utils.path.dirname(import.meta.resolve('@capire/xflights/package.json')).replace('file:', '')

// if .cdsrc-private.json files exist they will pollute the services
try { fs.rmSync(cds.utils.path.resolve(xtravelsDir, '.cdsrc-private.json')) } catch { }
try { fs.rmSync(cds.utils.path.resolve(xflightsDir, '.cdsrc-private.json')) } catch { }

console.log('Data Sphere Setup')
const xflightsDataSphere = await ensureDataSphere()

console.log('HDI + Data Sphere stored')
fs.writeFileSync(cds.utils.path.resolve(xflightsDir, 'default-env.json'), JSON.stringify({
  VCAP_SERVICES: {
    hana: [xflights]
  },
}, null, 2))

fs.writeFileSync(cds.utils.path.resolve(import.meta.dirname, '../default-env.json'), JSON.stringify({
  TARGET_CONTAINER: travels.name,
  VCAP_SERVICES: {
    hana: [travels, xflights],
    'user-provided': [xflightsDataSphere]
  },
}, null, 2))

console.log('remote setup')
const hana2hana = {
  name: 'xflights',
  adapter: 'hanaodbc',
  configuration: `Driver=libodbcHDB.so;ServerNode=${xflights.credentials.host}:${xflights.credentials.port.replace('00', '00') /* hxe internal port is 39041 */};trustall=TRUE;encrypt=TRUE;sslValidateCertificate=FALSE`,
  credential: `user=${xflights.credentials.user};password=${xflights.credentials.password}`,
}

const hana2rap = {
  name: 'sflight-rap',
  adapter: 'ODataAdapter',
  configuration: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ConnectionProperties name="connection_properties">
  <PropertyEntry name="URL" displayName="URL">https://abap:50001/sap/opu/odata/DMO/UI_TRAVEL_A_D_O2/</PropertyEntry>
</ConnectionProperties>`,
  credential: `<CredentialEntry name="password"><user>DEVELOPER</user><password>ABAPtr2022#01</password></CredentialEntry>`,
  cert: `-----BEGIN CERTIFICATE-----
MIICWDCCAcECCAogFwQEBlMBMA0GCSqGSIb3DQEBCwUAMHExCzAJBgNVBAYTAkRF
MRwwGgYDVQQKExNTQVAgVHJ1c3QgQ29tbXVuaXR5MRMwEQYDVQQLEwpTQVAgV2Vi
IEFTMRQwEgYDVQQLEwtJREVNT1NZU1RFTTEZMBcGA1UEAwwQKi5kdW1teS5ub2Rv
bWFpbjAeFw0xNzA0MDQwNjUzMDFaFw0zODAxMDEwMDAwMDFaMHExCzAJBgNVBAYT
AkRFMRwwGgYDVQQKExNTQVAgVHJ1c3QgQ29tbXVuaXR5MRMwEQYDVQQLEwpTQVAg
V2ViIEFTMRQwEgYDVQQLEwtJREVNT1NZU1RFTTEZMBcGA1UEAwwQKi5kdW1teS5u
b2RvbWFpbjCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAsnkwjakB2kFfTD1/
uce4jSxs/0ufkXuHZhPNQ5No4vysqslhOcgIJBtYfEGtCzzFWPcY3PdzwK0pMPYF
nZDlAwrU8W1YqIqtlarFS1QsUMXqUpISgihUf9QOY8FEuivgZfk6qVwdauSY9SMr
5gRaJiI0ZjcabRtokZgD/P3H5usCAwEAATANBgkqhkiG9w0BAQsFAAOBgQBECAqq
UGP21ujdaoPxls7D0hyycPO4ZUkJ6OzDpv1gul6IhM559LFWdJigHaKJDeK4GOo4
Koj8UqYCYLKr/iUkzn4T1cQSUUPAFknn+HNE4hho2Qk/pmUCkT8jV6NLHg0phtjS
Jjp0ztLH/VlXfiveTZvizl/FqA4k2RpnSVtQgQ==
-----END CERTIFICATE-----
`
}

await ensureRemoteSource(hana2hana)
await grantRemoteSource(hana2hana, travels.credentials)

await ensureRemoteSource(hana2rap)
await grantRemoteSource(hana2rap, travels.credentials)

console.log('xflights deploy')
await new Promise((resolve, reject) => {
  const deploy = cp.spawn('cds', ['deploy', '-2', 'hana'], {
    cwd: xflightsDir,
    stdio: 'pipe', // for debugging switch to 'inherit'
    env: {
      PATH: process.env.PATH,
    },
  })
  deploy.on('exit', code => {
    if (code) return reject(new Error(`Failed to deploy xflight (${code})`))
    return resolve()
  })
})

async function hdiContainer(isolate) {
  const connector = await cds.connect.to('db-hdi', { kind: 'hana', credentials })
  await connector.run(`CREATE ROLE "${(isolate.database + '_' + isolate.tenant).toUpperCase()}::access_role"`).catch(() => { })
  await connector.database(isolate)
  await connector.tenant(isolate)
  const creds = { ...connector.options.credentials }
  delete creds.__system__
  delete creds.__database__
  const hdi_credentials = {
    "binding_guid": cds.utils.uuid(),
    "binding_name": null,
    "credentials": {
      ...creds,
      "database_id": database,
      "host": creds.host,
      "port": creds.port,
      "schema": creds.schema,
      "user": creds.user,
      "password": creds.password,
      "hdi_user": creds.user,
      "hdi_password": creds.password,
      "driver": "com.sap.db.jdbc.Driver",
      "url": `jdbc:sap://hana:${creds.port}?encrypt=true&validateCertificate=false&currentschema=${creds.schema}&disableCloudRedirect=true`,
    },
    "instance_guid": cds.utils.uuid(),
    "instance_name": isolate.tenant,
    "label": "hana",
    "name": isolate.tenant,
    "plan": "hdi-shared",
    "provider": null,
    "syslog_drain_url": null,
    "tags": [
      "hana",
      "database",
      "relational"
    ],
    "volume_mounts": []
  }

  return hdi_credentials
}

/**
 * Creates a remote source
 * @param {object} remote Remote source configurations
 * @param {string} remote.name Remote source name
 */
async function ensureRemoteSource(remote) {
  const connector = await cds.connect.to('db-connector', { kind: "hana", credentials })

  await connector.tx(async tx => {
    const { name } = remote

    const adapterExists = await tx.run(`SELECT TO_BOOLEAN(IS_SYSTEM_ADAPTER) AS "native" FROM SYS.ADAPTERS WHERE ADAPTER_NAME='${remote.adapter}'`)
    // For new HANA systems it is required to "create" the adapter once that is done all adapters show up
    if (!adapterExists.length) await tx.run(`CREATE ADAPTER "${remote.adapter}" PROPERTIES '' AT LOCATION DPSERVER;`).catch((err) => { debugger })
    const isNative = adapterExists[0]?.native

    // Check if realtime replication is supported
    const rtrSupported = await tx.run(`SELECT TO_BOOLEAN(IS_CDC_SUPPORTED) FROM SYS.ADAPTER_CAPABILITIES WHERE ADAPTER_NAME='${remote.adapter}'`)

    const remoteSourceExists = await tx.run(`SELECT * FROM SYS.REMOTE_SOURCES WHERE REMOTE_SOURCE_NAME='${name}'`)
    if (remoteSourceExists.length) {
      await tx.run(`ALTER REMOTE SOURCE "${name}" ADAPTER "${remote.adapter}"${isNative ? '' : ' AT LOCATION DPSERVER'}
              CONFIGURATION '${remote.configuration.replaceAll("'", "''")}'
              WITH CREDENTIAL TYPE 'PASSWORD' USING '${remote.credential.replaceAll("'", "''")}'`)
    } else {
      await tx.run(`CREATE REMOTE SOURCE "${name}" ADAPTER "${remote.adapter}"${isNative ? '' : ' AT LOCATION DPSERVER'}
              CONFIGURATION '${remote.configuration.replaceAll("'", "''")}'
              WITH CREDENTIAL TYPE 'PASSWORD' USING '${remote.credential.replaceAll("'", "''")}'`)
    }

    if (remote.cert) {
      const certName = `"${name}_CERT"`
      await tx.run(`CREATE PSE REMOTE_SOURCES`).catch(err => err)
      await tx.run(`CREATE CERTIFICATE ${certName} FROM '${remote.cert}'`).catch(err => err)
      await tx.run(`ALTER PSE REMOTE_SOURCES ADD CERTIFICATE ${certName};`).catch(err => err)
      await tx.run(`SET PSE REMOTE_SOURCES PURPOSE REMOTE SOURCE;`).catch(err => err)
    }

    await tx.run(`CALL CHECK_REMOTE_SOURCE('${name}')`)
  })
  await connector.disconnect()
}

async function grantRemoteSource(remote, creds) {
  const connector = await cds.connect.to('db-connector', { kind: "hana", credentials })

  await connector.tx(async tx => {
    const { name } = remote
    await tx.run(`GRANT CREATE VIRTUAL TABLE ON REMOTE SOURCE "${name}" TO ${creds.schema}#OO`)
    await tx.run(`GRANT CREATE REMOTE SUBSCRIPTION ON REMOTE SOURCE "${name}" TO ${creds.schema}#OO`)
    await tx.run(`GRANT LINKED DATABASE ON REMOTE SOURCE "${name}" TO ${creds.schema}#OO`)

    await tx.run(`GRANT CREATE VIRTUAL TABLE ON REMOTE SOURCE "${name}" TO ${creds.schema}`)
  })

  await connector.disconnect()
}

async function ensureDataSphere(space = 'TESTS_SPACE_0') {
  const res = await fetch(`http://localhost:15002/dwaas-core/space/${space}/databaseusers/reset`, {
    "method": 'POST',
    "headers": {
      "content-type": "application/json",
      "x-csrf-token": "null",
    },
    "body": JSON.stringify({ username: 'TESTS_SPACE_0#CAFE' }),
  })

  const creds = await res.json()

  return {
    "binding_guid": cds.utils.uuid(),
    "binding_name": null,
    "credentials": {
      ...credentials,
      ...creds,
      user: creds.username,
      schema: space,
      type: 'procedure',
      procedure_schema: `${space}$TEC`,
      procedure: 'HDI_GRANTOR_FOR_CUPS',
    },
    "instance_guid": cds.utils.uuid(),
    "instance_name": "xflights-datasphere",
    "label": "user-provided",
    "name": "xflights-datasphere",
    "plan": "hdi-shared",
    "provider": null,
    "syslog_drain_url": null,
    "tags": [
      "hana",
    ],
    "volume_mounts": []
  }
}