const cds = require('@sap/cds')

const { GET, POST, PATCH, DELETE, axios, expect } = cds.test(__dirname + '/..', '--with-mocks')
axios.defaults.auth = { username: 'alice', password: 'admin' }
axios.defaults.validateStatus = () => true

describe('Status Transition Flows', () => {
  const READ = async (ID, IsActiveEntity = true) => {
    const { data: travel } = await GET(`/odata/v4/travel/Travels(ID=${ID},IsActiveEntity=${IsActiveEntity})`)
    if (IsActiveEntity)
      travel.transitions_ = await SELECT('sap.capire.travels.Travels.transitions_').where({ up__ID: ID })
    return travel
  }

  beforeEach(async () => {
    await cds.ql.DELETE('sap.capire.travels.Travels.transitions_')
  })

  it('flows like a charm', async () => {
    let travel

    travel = await READ(1)
    expect(travel.Status_code).to.eql('O')
    expect(travel.transitions_).to.have.length(0)

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/acceptTravel', {})
    travel = await READ(1)
    expect(travel.Status_code).to.eql('A')
    expect(travel.transitions_).to.have.length(1)

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/draftEdit', {})
    travel = await READ(1, false)
    expect(travel.Status_code).to.eql('O')

    const res = await GET('/odata/v4/travel/Travels(ID=1,IsActiveEntity=false)?$expand=transitions_')
    expect(res.status).to.eql(400)

    await PATCH('/odata/v4/travel/Travels(ID=1,IsActiveEntity=false)', { Description: 'foo' })
    travel = await READ(1, false)
    expect(travel.Status_code).to.eql('R')

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=false)/draftActivate', {})
    travel = await READ(1)
    expect(travel.Status_code).to.eql('O')
    expect(travel.transitions_).to.have.length(2)

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/rejectTravel', {})
    travel = await READ(1)
    expect(travel.Status_code).to.eql('R')
    expect(travel.transitions_).to.have.length(3)

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/reopenTravel', {})
    travel = await READ(1)
    expect(travel.Status_code).to.eql('O')
    expect(travel.transitions_).to.have.length(4)
  })

  // NOTE: not applicable with transitions_ being excluded from projections
  it.skip('prohibits altering the flow history', async () => {
    let res

    await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/acceptTravel', {})
    const travel = await READ(1)
    expect(travel.Status_code).to.eql('A')
    expect(travel.transitions_).to.have.length(1)

    const transition = `up__ID=1,timestamp=${travel.transitions_[0].timestamp}`

    res = await GET(`/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/transitions_(${transition})`)
    expect(res.status).to.eql(200)

    res = await POST('/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/transitions_', {
      comment: `I shouldn't be able to do this`
    })
    expect(res.status).to.eql(405)

    res = await PATCH(`/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/transitions_(${transition})`, {
      comment: `Not this either`
    })
    expect(res.status).to.eql(405)

    res = await DELETE(`/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/transitions_(${transition})`)
    expect(res.status).to.eql(405)
  })
})
