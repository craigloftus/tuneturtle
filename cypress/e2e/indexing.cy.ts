describe('Indexing Page', () => {
  beforeEach(() => {
    cy.visit('/indexing')
  })

  it('should display indexing progress', () => {
    cy.contains('Indexing Music Library')
    cy.get('.progress').should('exist')
    cy.contains('Please wait while we index your music library')
  })

  it('should handle successful indexing', () => {
    // Mock successful S3 list objects response
    cy.intercept('GET', '**/s3/list**', {
      statusCode: 200,
      body: {
        tracks: [
          {
            key: 'test-track.mp3',
            size: 1024,
            lastModified: new Date().toISOString(),
            url: 'https://test-url.com/test-track.mp3',
            album: 'Test Album',
            fileName: 'test-track.mp3'
          }
        ],
        nextContinuationToken: null,
        isTruncated: false,
        totalFound: 1,
        maxKeys: 100
      }
    }).as('listObjects')

    cy.wait('@listObjects')
    cy.contains('Found 1 tracks in your music library')
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should handle indexing errors', () => {
    // Mock failed S3 list objects response
    cy.intercept('GET', '**/s3/list**', {
      statusCode: 400,
      body: { message: 'Failed to access S3 bucket' }
    }).as('listObjectsError')

    cy.wait('@listObjectsError')
    cy.contains('Failed to index music library')
    cy.contains('Back to Setup').click()
    cy.url().should('include', '/setup')
  })
})
