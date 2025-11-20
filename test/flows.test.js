const cds = require('@sap/cds')

const { GET, POST, PATCH, DELETE, axios, expect } = cds.test(__dirname + '/..', '--with-mocks')
axios.defaults.auth = { username: 'alice', password: 'admin' }
axios.defaults.validateStatus = () => true

describe('Status Transition Flows', () => {
  const READ = async () => {
    const { data: travel } = await GET(`/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)`)
    travel.transitions_ = await SELECT('sap.capire.travels.Travels.transitions_').where({ up__ID: 1 })
    return travel
  }

  beforeEach(async () => {
    await cds.ql.DELETE('sap.capire.travels.Travels.transitions_')
  })

  it('flows like a charm', async () => {
    let travel

    travel = await READ()
    expect(travel.Status_code).to.eql('O')
    expect(travel.transitions_).to.have.length(0)

    // @from is checked
    const {
      data: {
        error: { message: error }
      }
    } = await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/acceptTravel', {})
    expect(error).to.eql('Action "acceptTravel" requires "Status_code" to be "["InReview"]".')

    // @to is set
    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/reviewTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('P')
    expect(travel.transitions_).to.have.length(1)

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/rejectTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('X')
    expect(travel.transitions_).to.have.length(2)

    // @to: $flow.previous restores the previous status
    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/reopenTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('P')
    expect(travel.transitions_).to.have.length(3)

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/acceptTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('A')
    expect(travel.transitions_).to.have.length(4)
  })
})
