const cds = require('@sap/cds')

const { GET, POST, axios, expect } = cds.test(__dirname + '/..', '--with-mocks', '--profile', 'flow')
axios.defaults.auth = { username: 'alice', password: 'admin' }
axios.defaults.validateStatus = () => true

describe('Status Transition Flows', () => {
  const READ = async () => {
    const { data: travel } = await GET(`/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)`)
    return travel
  }

  it('flows like a charm', async () => {
    let travel

    travel = await READ()
    expect(travel.Status_code).to.eql('O')

    // @from is checked
    const {
      data: {
        error: { message: error }
      }
    } = await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/acceptTravel', {})
    expect(error).to.eql('Action "acceptTravel" requires "Status_code" to be "["InReview"]".')

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/blockTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('B')

    // @to: $flow.previous restores the previous status
    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/unblockTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('O')

    // @to is set
    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/reviewTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('P')

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/blockTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('B')

    // @to: $flow.previous restores the previous status
    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/unblockTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('P')

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/acceptTravel', {})
    travel = await READ()
    expect(travel.Status_code).to.eql('A')
  })
})
