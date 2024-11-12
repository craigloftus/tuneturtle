import '@testing-library/cypress/add-commands'

// Add custom commands here if needed
Cypress.Commands.add('mockS3ListObjects', (response = {}) => {
  cy.intercept('GET', '**/s3/list**', {
    statusCode: 200,
    body: {
      tracks: [],
      nextContinuationToken: null,
      isTruncated: false,
      totalFound: 0,
      maxKeys: 100,
      ...response
    }
  }).as('listObjects')
})

Cypress.Commands.add('mockS3Credentials', (response = {}) => {
  cy.intercept('POST', '/api/aws/validate', {
    statusCode: 200,
    body: { success: true, ...response }
  }).as('validateCredentials')
})

declare global {
  namespace Cypress {
    interface Chainable {
      mockS3ListObjects(response?: object): Chainable<void>
      mockS3Credentials(response?: object): Chainable<void>
    }
  }
}
