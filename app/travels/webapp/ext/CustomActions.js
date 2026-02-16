sap.ui.define(
  ["sap/m/MessageToast", "sap/ui/core/library"],
  function (MessageToast) {
    return {
      exportJSON: async function () {
        // REVISIT: we bypass the actual OData model here and retrieve it manually
        const serviceUrl = this.getModel().sServiceUrl
        const url = `${serviceUrl + (serviceUrl.endsWith('/') ? '' : '/')}TravelService.exportJSON()`
        window.open(url, "_self")

        const oBundle = this.getModel("i18n").getResourceBundle()
        const sMsg = oBundle.getText("exportSucess")
        MessageToast.show(sMsg)
      },
      exportCSV: async function () {
        // REVISIT: we bypass the actual OData model here and retrieve it manually
        const serviceUrl = this.getModel().sServiceUrl
        const url = `${serviceUrl + (serviceUrl.endsWith('/') ? '' : '/')}TravelService.exportCSV()`
        window.open(url, "_self")

        const oBundle = this.getModel("i18n").getResourceBundle()
        const sMsg = oBundle.getText("exportSucess")
        MessageToast.show(sMsg)
      }
    }
  }
)