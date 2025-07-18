const cds = require('@sap/cds')
const { GET, POST, PATCH, axios, expect } = cds.test(__dirname+'/..')
const EDIT = (url) => POST (url+'/TravelService.draftEdit',{})
const SAVE = (url) => POST (url+'/TravelService.draftActivate')
axios.defaults.auth = { username: 'alice', password: 'admin' }

const ID = '1'

describe ("Basic Querying", () => {

  it ("should read from row references", async()=>{
    const travel = await SELECT.one `TravelService.Travels` .where ({ ID })
    expect (travel) .to.exist
    expect (travel.ID) .to.eql (1)
  })

  it ("should read with row references in subselects", async()=>{
    const { Travels } = cds.entities ('TravelService')
    const travel = await SELECT.one.from (Travels) .where ({
      ID: SELECT.one `Travel` .from `TravelService.Bookings` .where ({
        Travel_ID: ID, Pos: 1
      })
    })
    expect (travel) .to.exist
    expect (travel.ID) .to.eql (1)
  })

})



describe('Basic OData', () => {

  it('serves $metadata documents in v4', async () => {
    const { headers, status, data } = await GET `/odata/v4/travel/$metadata`
    expect(status).to.equal(200)
    expect(headers).to.contain({
      // 'content-type': 'application/xml', //> fails with 'application/xml;charset=utf-8', which is set by express
      'odata-version': '4.0',
    })
    expect(headers['content-type']).to.match(/application\/xml/)
    expect(data).to.contain('<EntitySet Name="Travels" EntityType="TravelService.Travels">')
    expect(data).to.contain('<Annotation Term="Common.Label" String="Travel"/>')
  })

  it('GET /odata/v4/travel/Travels', async () => {
    const { data } = await GET `/odata/v4/travel/Travels?$filter=ID eq 175`
    expect(data.value).to.containSubset([{
      BeginDate: '2023-08-02',
      BookingFee: 60,
      createdAt: expectedValue => /2023-07-16T18:42:07\.000(0000)?Z/.test(expectedValue), // timestamp precision increase with cds^7
      createdBy: 'Hansmann',
      Currency_code: 'SGD',
      Description: 'Sightseeing in Singapore',
      EndDate: '2024-05-29',
      HasActiveEntity: false,
      HasDraftEntity: false,
      IsActiveEntity: true,
      modifiedAt: expectedValue => /2023-07-27T03:18:18\.000(0000)?Z/.test(expectedValue), // timestamp precision increase with cds^7
      modifiedBy: 'Deichgraeber',
      Agency_ID: '070029',
      Customer_ID: '000318',
      TotalPrice: 23439,
      ID: 175,
      Status_code: 'A',
    }])
  })

  it('supports $select', async () => {
    const { data } = await GET(`/odata/v4/travel/Travels`, {
      params: { $select: `ID,Description` }
    })
    expect(data.value).to.containSubset([
      { ID: 175, Description: 'Sightseeing in Singapore' }
    ])
  })

  it('supports $expand', async () => {
    const { data } = await GET(`/odata/v4/travel/Travels`, {
      params: {
        $select: `ID`,
        $expand: `Agency($select=Name,City)`
      }
    })
    expect(data.value).to.containSubset([
      { ID: 175, Agency: {Name: "Up 'n' Away", City:'Hannover'} },
    ])
  })

  it('supports $value requests', async () => {
    const { data } = await GET `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/Customer/LastName/$value`
    expect(data).to.equal('Prinz')
  })

  it('supports $top/$skip paging', async () => {
    const { data: p1 } = await GET `/odata/v4/travel/Travels?$select=ID,Description&$top=3&$orderby=ID`
    expect(p1.value).to.containSubset([
      {"Description": "Business Trip for Christine, Pierre", "ID": 1},
      {"Description": "Vacation", "ID": 2},
      {"Description": "Vacation", "ID": 3},
    ])
    const { data: p2 } = await GET `/odata/v4/travel/Travels?$select=Description&$skip=3&$orderby=ID`
    expect(p2.value).not.to.containSubset([
      {"Description": "Business Trip for Christine, Pierre", "ID": 1},
      {"Description": "Vacation", "ID": 2},
      {"Description": "Vacation", "ID": 3},
    ])
  })

  it('new draft has initial key, key is auto incremented upon activation', async () => {
    const { data: newDraft } = await POST(`/odata/v4/travel/Travels`, {})
    expect(newDraft).to.contain({ ID: 0 }) // initial value: 0

    // patch new draft in order to fill mandatory fields
    await PATCH (`/odata/v4/travel/Travels(ID='${newDraft.ID}',IsActiveEntity=false)`, {
      BeginDate: '2028-04-01',
      EndDate: '2028-04-02',
      BookingFee: '11',
      Customer_ID: '000001',
      Agency_ID: '070001',
      Currency_code: 'USD'
    })

    const { data: newTravel } = await SAVE (`/odata/v4/travel/Travels(ID='${newDraft.ID}',IsActiveEntity=false)`)
    expect(newTravel).to.contain({ ID: 4134, TotalPrice: 11 })
  })

  it ('re-calculates totals after booking fee changed', async ()=>{
    let Travel4133 = `/odata/v4/travel/Travels(ID=4133,IsActiveEntity=true)`
    let Draft = `/odata/v4/travel/Travels(ID=4133,IsActiveEntity=false)`
    let Booking = `/odata/v4/travel/Bookings(Travel_ID=4133,Pos=1,IsActiveEntity=false)`
    let Supplement = `/odata/v4/travel/Bookings_Supplements(ID='85D87221A8E4645C17002DF03754AB66',IsActiveEntity=false)`

    // const { TravelService } = cds.services
    // const { Travels, Bookings, 'Bookings.Supplements': Supplements } = TravelService.entities
    // {
    //   let [{TotalPrice,fee}] = await cds.run(`SELECT TotalPrice, coalesce (BookingFee,0) as fee from ${Travels} where ID = 4133`)
    //   let [{sum1}] = await cds.run(`SELECT coalesce (sum(FlightPrice),0) as sum1 from ${Bookings} where Travel_ID = 4133`)
    //   let [{sum2}] = await cds.run(`SELECT coalesce (sum(Price),0) as sum2 from ${Supplements} where up__Travel_ID = 4133`)
    //   let total =  fee + sum1 + sum2
    //   console.log (TotalPrice,total)
    // }

    // Ensure we have a draft with ID 4133
    let { data:draft } = await EDIT (Travel4133)
    // {
    //   let [{TotalPrice,fee}] = await cds.run(`SELECT TotalPrice, coalesce (BookingFee,0) as fee from ${Travels.drafts} where ID = 4133`)
    //   let [{sum1}] = await cds.run(`SELECT coalesce (sum(FlightPrice),0) as sum1 from ${Bookings.drafts} where Travel_ID = 4133`)
    //   let [{sum2}] = await cds.run(`SELECT coalesce (sum(Price),0) as sum2 from ${Supplements.drafts} where up__Travel_ID = 4133`)
    //   let total =  fee + sum1 + sum2
    //   console.log (TotalPrice,total)
    // }
    expect(draft).to.containSubset({
      TotalPrice: 7375,
      ID: 4133,
    })


    // Ensure it is not in accepted state as that would disallow changing
    await PATCH (Draft, { Status_code: 'O' }) // REVISIT: should actually be forbidden !!!
    await PATCH (Draft, { BeginDate: '2222-01-01', EndDate: '2222-01-02' })

    // Change the Travel's Booking Fee
    await PATCH (Draft, { BookingFee: 120 })
    // {
    //   let [{TotalPrice,fee}] = await cds.run(`SELECT TotalPrice, coalesce (BookingFee,0) as fee from ${Travels.drafts} where ID = 4133`)
    //   let [{sum1}] = await cds.run(`SELECT coalesce (sum(FlightPrice),0) as sum1 from ${Bookings.drafts} where Travel_ID = 4133`)
    //   let [{sum2}] = await cds.run(`SELECT coalesce (sum(Price),0) as sum2 from ${Supplements.drafts} where up__Travel_ID = 4133`)
    //   let total =  fee + sum1 + sum2
    //   console.log (TotalPrice,total)
    // }
    await expect (get_totals()).to.eventually.eql(7475)

    // Change a Booking's Flight Price
    await PATCH (Booking, { FlightPrice: 1657 })
    await expect (get_totals()).to.eventually.eql(5475)

    // Change a Supplement's Price
    await PATCH (Supplement, { Price: 220 })
    await expect (get_totals()).to.eventually.eql(5675)

    // Save Draft
    await SAVE (Draft)
    await expect (get_totals(true)).to.eventually.eql(5675)

    async function get_totals (_active = false) {
      let { data } = await GET `/odata/v4/travel/Travels(ID=4133,IsActiveEntity=${_active})?
        $select=TotalPrice
      `
      return data.TotalPrice
    }
  })

  it('deduct discount multiple times does not end up in error', async () => {
    const { data: res1 } = await GET `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)`
    expect(res1).to.contain({ TotalPrice: 900, BookingFee: 20 })

    await POST(
      `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/TravelService.deductDiscount`,
      { percent: 11 }
    )
    const { data: res2 } = await GET `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)`
    expect(res2).to.contain({ TotalPrice: 897.8, BookingFee: 17.8 })

    await POST(
      `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/TravelService.deductDiscount`,
      { percent: 11 }
    )

    const { data: res3 } = await GET `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)`
    expect(res3).to.contain({ TotalPrice: 895.842, BookingFee: 15.842 })

    await POST(
      `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)/TravelService.deductDiscount`,
      { percent: 11 }
    )
    // rounded to 3 decimals
    const { data: res4 } = await GET `/odata/v4/travel/Travels(ID=1,IsActiveEntity=true)`
    expect(res4).to.contain({ TotalPrice: 894.099, BookingFee: 14.099 })
  })

  it('allows deducting discounts on drafts as well', async ()=>{
    const Active = `/odata/v4/travel/Travels(ID=66,IsActiveEntity=true)`
    const Draft = `/odata/v4/travel/Travels(ID=66,IsActiveEntity=false)`

    const { data:res0 } = await GET (Active)
    expect(res0).to.contain({ ID:66, TotalPrice: 729, BookingFee: 10 })

    const { data:res1 } = await EDIT (Active)
    expect(res1).to.contain({ TotalPrice: 729, BookingFee: 10 })

    // Change the Travel's dates to avoid validation errors
    const today = new Date, tomorrow = new Date; tomorrow.setDate(today.getDate()+1)
    await PATCH (Draft, { BeginDate: today.toISOString().slice(0,10) })
    await PATCH (Draft, { EndDate: tomorrow.toISOString().slice(0,10) })

    await POST (`${Draft}/TravelService.deductDiscount`, { percent: 50 })
    const { data:res2 } = await GET `/odata/v4/travel/Travels(ID=66,IsActiveEntity=false)`
    expect(res2).to.contain({ TotalPrice: 724, BookingFee: 5 })

    const { data:res3 } = await GET (Draft)
    expect(res3).to.contain({ TotalPrice: 724, BookingFee: 5 })

    await SAVE (Draft)

    const { data:res4 } = await GET (Active)
    expect(res4).to.contain({ TotalPrice: 724, BookingFee: 5 })
  })

})
