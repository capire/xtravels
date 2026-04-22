const cds = require('@sap/cds')
const xtravels = cds.utils.path.join(__dirname, '..')
const { POST, PUT, PATCH, DELETE, GET, expect, axios } = cds.test(xtravels, '--with-mocks')
axios.defaults.auth = { username: 'alice' }
axios.defaults.validateStatus = () => true

describe('Direct CRUD', () => {

  it('should create an active instance via POST', async () => {
    const createActiveResponse = await POST('/odata/v4/travel/Travels', {
      BeginDate: '2026-01-01',
      EndDate: '2026-12-31',
      Agency_ID: '070007',
      Description: 'Initial Description',
      Customer_ID: '000042',
    })

    expect(createActiveResponse).to.be.ok
    expect(createActiveResponse.data?.error).to.be.undefined
    expect(createActiveResponse.status).to.equal(201)
  })

  it('should create a draft instance via draftNew action', async () => {
    const draftNewResponse = await POST('/odata/v4/travel/Travels/draftNew')

    expect(draftNewResponse).to.be.ok
    expect(draftNewResponse.data?.error).to.be.undefined
    expect(draftNewResponse.status).to.equal(201)

    expect(draftNewResponse.data.IsActiveEntity).to.be.false
    expect(draftNewResponse.data.HasActiveEntity).to.be.false
  })

  it('should create a draft instance via POST when request body contains IsActiveEntity=false', async () => {
    const createDraftResponse = await POST('/odata/v4/travel/Travels', {
      IsActiveEntity: false,
    })

    expect(createDraftResponse).to.be.ok
    expect(createDraftResponse.data?.error).to.be.undefined
    expect(createDraftResponse.status).to.equal(201)

    expect(createDraftResponse.data.IsActiveEntity).to.be.false
    expect(createDraftResponse.data.HasActiveEntity).to.be.false
  })

  describe('when an active instance exists', () => {
    let ACTIVE_ENTITY_ID

    beforeEach(async () => {
      const createActiveResponse = await POST('/odata/v4/travel/Travels', {
        BeginDate: '2026-01-01',
        EndDate: '2026-12-31',
        Agency_ID: '070007',
        Description: 'Initial Description',
        Customer_ID: '000042',
      })

      expect(createActiveResponse).to.be.ok
      expect(createActiveResponse.data?.error).to.be.undefined
      expect(createActiveResponse.status).to.equal(201)
      expect(createActiveResponse.data.ID).to.be.ok
      ACTIVE_ENTITY_ID = createActiveResponse.data.ID
    })

    it('should update the active instance via PUT', async () => {
      const updateActiveResponse = await PUT(
        `/odata/v4/travel/Travels(ID=${ACTIVE_ENTITY_ID},IsActiveEntity=true)`,
        { Description: 'Updated Description' },
      )

      expect(updateActiveResponse).to.be.ok
      expect(updateActiveResponse.data?.error).to.be.undefined
      expect(updateActiveResponse.status).to.equal(200)
    })

    it('should update the active instance via PATCH', async () => {
      const updateActiveResponse = await PATCH(
        `/odata/v4/travel/Travels(ID=${ACTIVE_ENTITY_ID},IsActiveEntity=true)`,
        { Description: 'Updated Description' },
      )

      expect(updateActiveResponse).to.be.ok
      expect(updateActiveResponse.data?.error).to.be.undefined
      expect(updateActiveResponse.status).to.equal(200)

      expect(updateActiveResponse.data.IsActiveEntity).to.be.true
      expect(updateActiveResponse.data.HasDraftEntity).to.be.false
    })

    it('should put the active entity in draft mode on draftEdit', async () => {
      const draftEditResponse = await POST(
        `/odata/v4/travel/Travels(ID=${ACTIVE_ENTITY_ID},IsActiveEntity=true)/draftEdit`,
      )

      expect(draftEditResponse).to.be.ok
      expect(draftEditResponse.data?.error).to.be.undefined
      expect(draftEditResponse.status).to.equal(201)

      expect(draftEditResponse.data.IsActiveEntity).to.be.false
      expect(draftEditResponse.data.HasActiveEntity).to.be.true
    })

    it('should allow to reference the active instance without specifying IsActiveEntity', async () => {
      const response = await GET(
        `/odata/v4/travel/Travels(ID=${ACTIVE_ENTITY_ID})`,
      )

      expect(response).to.be.ok
      expect(response.data?.error).to.be.undefined
      expect(response.status).to.equal(200)
    })

    it('should allow to reference the active instance without specifying key names', async () => {
      const response = await GET(
        `/odata/v4/travel/Travels(${ACTIVE_ENTITY_ID})`,
      )

      expect(response).to.be.ok
      expect(response.data?.error).to.be.undefined
      expect(response.status).to.equal(200)
    })

    it('should allow to delete the active instance via DELETE', async () => {
      const deleteResponse = await DELETE(
        `/odata/v4/travel/Travels(ID=${ACTIVE_ENTITY_ID},IsActiveEntity=true)`,
      )

      expect(deleteResponse).to.be.ok
      expect(deleteResponse.data?.error).to.be.undefined
      expect(deleteResponse.status).to.equal(204)
    })

    describe('when the instance is draft-locked by another user', () => {
      beforeEach(async () => {
        const response = await POST(
          `/odata/v4/travel/Travels(${ACTIVE_ENTITY_ID})/draftEdit`,
        )

        expect(response).to.be.ok
        expect(response.data?.error).to.be.undefined
        expect(response.status).to.equal(201)
      })

      test('should not allow another user to edit the active entity while locked', async () => {
        const editActiveResponse = await PUT(
          `/odata/v4/travel/Travels(${ACTIVE_ENTITY_ID})`,
          { Description: 'Updated Description' },
          { headers: { Authorization: `Basic ${btoa('bob:')}` } },
        )

        expect(editActiveResponse).to.be.ok
        expect(editActiveResponse.data?.error).to.be.ok
        expect(editActiveResponse.data.error).to.have.property('code', 'DRAFT_ALREADY_EXISTS')
        expect(editActiveResponse.status).to.equal(409)
      })
    })
  })

  describe('when a draft instance exists', () => {
    let DRAFT_ENTITY_ID

    beforeEach(async () => {
      const createDraftResponse = await POST(
        '/odata/v4/travel/Travels/draftNew',
        {
          BeginDate: '2026-01-01',
          EndDate: '2026-12-31',
          Agency_ID: '070007',
          Description: 'Initial Description',
          Customer_ID: '000042',
        },
      )

      expect(createDraftResponse).to.be.ok
      expect(createDraftResponse.data?.error).to.be.undefined
      expect(createDraftResponse.status).to.equal(201)

      DRAFT_ENTITY_ID = createDraftResponse.data.ID
    })

    it('should update the draft instance via PUT', async () => {
      const updateDraftResponse = await PUT(
        `/odata/v4/travel/Travels(ID=${DRAFT_ENTITY_ID},IsActiveEntity=false)`,
        { Description: 'Updated Description' },
      )

      expect(updateDraftResponse).to.be.ok
      expect(updateDraftResponse.data?.error).to.be.undefined
      expect(updateDraftResponse.status).to.equal(200)

      expect(updateDraftResponse.data.IsActiveEntity).to.be.false
      expect(updateDraftResponse.data.HasActiveEntity).to.be.false
    })

    it('should active the draft instance on draftActivate', async () => {
      const draftActivateResponse = await POST(
        `/odata/v4/travel/Travels(ID=${DRAFT_ENTITY_ID},IsActiveEntity=false)/draftActivate`,
        {},
      )

      expect(draftActivateResponse).to.be.ok
      expect(draftActivateResponse.data?.error).to.be.undefined
      expect(draftActivateResponse.status).to.equal(201)

      expect(draftActivateResponse.data.IsActiveEntity).to.be.true
      expect(draftActivateResponse.data.HasDraftEntity).to.be.false
    })
  })
})
