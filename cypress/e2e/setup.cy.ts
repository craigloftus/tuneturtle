describe('Setup Page', () => {
  beforeEach(() => {
    cy.visit('/setup')
  })

  it('should display the AWS setup form', () => {
    cy.contains('Setup AWS S3')
    cy.contains('Configure your AWS S3 bucket')
    cy.get('form').within(() => {
      cy.get('input[name="accessKeyId"]').should('exist')
      cy.get('input[name="secretAccessKey"]').should('exist')
      cy.get('input[name="region"]').should('exist')
      cy.get('input[name="bucket"]').should('exist')
    })
  })

  it('should validate required fields', () => {
    cy.get('button[type="submit"]').click()
    cy.contains('Access Key ID is required')
    cy.contains('Secret Access Key is required')
    cy.contains('Region is required')
    cy.contains('Bucket name is required')
  })

  it('should handle successful AWS credentials submission', () => {
    const testCredentials = {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-1',
      bucket: 'test-bucket'
    }

    cy.intercept('POST', '/api/aws/validate', {
      statusCode: 200,
      body: { success: true }
    }).as('validateCredentials')

    cy.get('input[name="accessKeyId"]').type(testCredentials.accessKeyId)
    cy.get('input[name="secretAccessKey"]').type(testCredentials.secretAccessKey)
    cy.get('input[name="region"]').type(testCredentials.region)
    cy.get('input[name="bucket"]').type(testCredentials.bucket)
    cy.get('button[type="submit"]').click()

    cy.wait('@validateCredentials')
    cy.url().should('include', '/indexing')
  })

  it('should handle failed AWS credentials submission', () => {
    const testCredentials = {
      accessKeyId: 'invalid-key',
      secretAccessKey: 'invalid-secret',
      region: 'us-east-1',
      bucket: 'invalid-bucket'
    }

    cy.intercept('POST', '/api/aws/validate', {
      statusCode: 400,
      body: { message: 'Invalid AWS credentials' }
    }).as('validateCredentials')

    cy.get('input[name="accessKeyId"]').type(testCredentials.accessKeyId)
    cy.get('input[name="secretAccessKey"]').type(testCredentials.secretAccessKey)
    cy.get('input[name="region"]').type(testCredentials.region)
    cy.get('input[name="bucket"]').type(testCredentials.bucket)
    cy.get('button[type="submit"]').click()

    cy.wait('@validateCredentials')
    cy.contains('Invalid AWS credentials')
  })
})
