import fs from 'node:fs'
import cp from 'node:child_process'
import path from 'node:path'


const xtravelsDir = path.resolve(import.meta.dirname + '/../')
const xflightsDir = path.dirname(import.meta.resolve('@capire/xflights/package.json')).replace('file:', '')

// if .env files exist they will prevent binding generation
try { fs.rmSync(path.resolve(xtravelsDir, '.env')) } catch {}
try { fs.rmSync(path.resolve(xflightsDir, '.env')) } catch {}

const xtravels = await deploy(xtravelsDir)
const xflights = await deploy(xflightsDir)

fs.writeFileSync(path.resolve(xtravelsDir, '.cdsrc-private.json'), JSON.stringify(
  {
    "[fed-syn]": {
      requires: {
        db: xtravels,
        'sap.capire.flights.data': {
          ...xflights,
          vcap: { name: 'sap.capire.flights.data' }
        }
      }
    }
  },
  null,
  2
))

function deploy(cwd) {
  return new Promise((resolve, reject) => {
    const deploy = cp.spawn('cds', ['deploy', '-2', 'hana'], {
      cwd,
      stdio: 'pipe', // for debugging switch to 'inherit'
    })
    deploy.on('exit', code => {
      if (code) return reject(new Error(`Failed to deploy xflight (${code})`))
      const binding = JSON.parse(fs.readFileSync(path.resolve(cwd, '.cdsrc-private.json')))
      return resolve(binding.requires['[hybrid]'].db)
    })
  })
}
