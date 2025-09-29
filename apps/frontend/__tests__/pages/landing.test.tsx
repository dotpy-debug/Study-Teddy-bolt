import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Landing Page', () => {
  it('renders the main heading', () => {
    render(<Home />)

    expect(screen.getByText(/your ai-powered/i)).toBeInTheDocument()
    expect(screen.getByText(/study companion/i)).toBeInTheDocument()
  })

  it('renders the Study Teddy logo', () => {
    render(<Home />)

    const logos = screen.getAllByAltText(/study teddy logo/i)
    expect(logos.length).toBeGreaterThan(0)
    expect(logos[0]).toBeInTheDocument()
  })

  it('renders the hero image', () => {
    render(<Home />)

    const heroImage = screen.getByAltText(/study teddy studying at desk/i)
    expect(heroImage).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Home />)

    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    expect(screen.getByText(/get started/i)).toBeInTheDocument()
  })

  it('renders feature sections', () => {
    render(<Home />)

    expect(screen.getByText(/smart task management/i)).toBeInTheDocument()
    expect(screen.getByText(/ai study assistant/i)).toBeInTheDocument()
    expect(screen.getByText(/progress tracking/i)).toBeInTheDocument()
  })

  it('renders call-to-action section', () => {
    render(<Home />)

    expect(screen.getByText(/ready to transform your study habits/i)).toBeInTheDocument()
    expect(screen.getByText(/get started for free/i)).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<Home />)

    expect(screen.getByText(/© 2024 study teddy/i)).toBeInTheDocument()
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument()
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument()
  })
})