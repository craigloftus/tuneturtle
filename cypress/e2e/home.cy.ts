describe('Home Page', () => {
  beforeEach(() => {
    // Mock successful S3 list objects response
    cy.intercept('GET', '**/s3/list**', {
      statusCode: 200,
      body: {
        tracks: [
          {
            key: 'album1/track1.mp3',
            size: 1024,
            lastModified: new Date().toISOString(),
            url: 'https://test-url.com/track1.mp3',
            album: 'Album 1',
            fileName: 'track1.mp3'
          },
          {
            key: 'album1/track2.mp3',
            size: 1024,
            lastModified: new Date().toISOString(),
            url: 'https://test-url.com/track2.mp3',
            album: 'Album 1',
            fileName: 'track2.mp3'
          },
          {
            key: 'album2/track3.mp3',
            size: 1024,
            lastModified: new Date().toISOString(),
            url: 'https://test-url.com/track3.mp3',
            album: 'Album 2',
            fileName: 'track3.mp3'
          }
        ],
        nextContinuationToken: null,
        isTruncated: false,
        totalFound: 3,
        maxKeys: 100
      }
    }).as('listObjects')

    cy.visit('/')
  })

  it('should display grid view by default', () => {
    cy.contains('Music Library')
    cy.get('[data-testid="album-grid"]').should('exist')
    cy.get('[data-testid="album-card"]').should('have.length', 2)
  })

  it('should switch between grid and list views', () => {
    // Test grid to list view switch
    cy.get('button[aria-label="List view"]').click()
    cy.get('[data-testid="track-list"]').should('exist')
    cy.get('[data-testid="track-item"]').should('have.length', 3)

    // Test list to grid view switch
    cy.get('button[aria-label="Grid view"]').click()
    cy.get('[data-testid="album-grid"]').should('exist')
  })

  it('should play selected track', () => {
    cy.get('button[aria-label="List view"]').click()
    cy.get('[data-testid="track-item"]').first().click()
    cy.get('[data-testid="audio-player"]').should('exist')
    cy.get('audio').should('have.attr', 'src', 'https://test-url.com/track1.mp3')
  })

  it('should navigate to album tracks from grid view', () => {
    cy.get('[data-testid="album-card"]').first().click()
    cy.contains('Album 1')
    cy.get('[data-testid="track-item"]').should('have.length', 2)
  })

  it('should handle empty library state', () => {
    cy.intercept('GET', '**/s3/list**', {
      statusCode: 200,
      body: {
        tracks: [],
        nextContinuationToken: null,
        isTruncated: false,
        totalFound: 0,
        maxKeys: 100
      }
    }).as('emptyLibrary')

    cy.visit('/')
    cy.contains('No music tracks found')
    cy.contains('Go to Setup')
  })
})
