const cds = require('@sap/cds')

if (cds.env.profiles.includes('fed-rap')) {
  // Just a little hijack to inject the rap sflight model to xflights model transformation
  const resolver = require('@sap/cds-compiler/lib/utils/moduleResolve.js')

  const _makeModuleResolver = resolver.makeModuleResolver
  resolver.makeModuleResolver = function () {
    const ret = _makeModuleResolver.apply(this, arguments)
    return {
      resolveModule: async function (dep) {
        if (dep.module in { '@capire/xflights': 1, '@capire/xflights-api': 1 }) {
          return __dirname + '/index.cds'
        }
        return ret.resolveModule(dep)
      }
    }
  }

  const _makeModuleResolverSync = resolver.makeModuleResolverSync
  resolver.makeModuleResolverSync = function (a, b, c, d) {
    const ret = _makeModuleResolverSync.apply(this, arguments)
    return {
      resolveModule: function (dep) {
        if (dep.module in { '@capire/xflights': 1, '@capire/xflights-api': 1 }) {
          return __dirname + '/index.cds'
        }
        return ret.resolveModule(dep)
      }
    }
  }

}
