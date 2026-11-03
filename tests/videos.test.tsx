import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VideoSearch } from '@/features/videos/VideoSearch'

const searchVideos = vi.fn()
vi.mock('@/features/videos/api', () => ({ searchVideos: (q: string) => searchVideos(q) }))

const video = { id: 'abc123', title: 'Celdeling uitgelegd', channel: 'Meneer Wis', thumb: 'https://img/abc.jpg', published: '2026-01-01' }

beforeEach(() => searchVideos.mockReset())

describe('VideoSearch', () => {
  it('stelt de zoekopdracht samen met vak + onderwerp + "uitleg"', async () => {
    searchVideos.mockResolvedValue({ data: { videos: [], fallback: 'https://youtube.com/results?q', source: 'youtube' }, error: null })
    render(<VideoSearch subject="biologie" />)
    fireEvent.change(screen.getByLabelText('Onderwerp'), { target: { value: 'celdeling' } })
    fireEvent.click(screen.getByRole('button', { name: /Zoek/ }))
    await waitFor(() => expect(searchVideos).toHaveBeenCalledWith('Biologie celdeling uitleg'))
  })

  it('speelt een video pas na een klik, ingesloten via youtube-nocookie zonder autoplay', async () => {
    searchVideos.mockResolvedValue({ data: { videos: [video], fallback: 'https://youtube.com/results?q', source: 'youtube' }, error: null })
    render(<VideoSearch subject="biologie" />)
    fireEvent.change(screen.getByLabelText('Onderwerp'), { target: { value: 'celdeling' } })
    fireEvent.click(screen.getByRole('button', { name: /Zoek/ }))

    const result = await screen.findByText('Celdeling uitgelegd')
    // Vóór de klik: geen iframe (dus niets speelt vanzelf).
    expect(document.querySelector('iframe')).toBeNull()

    fireEvent.click(result)
    const frame = document.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123?rel=0')
    expect(frame.getAttribute('src')).not.toContain('autoplay')
  })

  it('toont altijd een YouTube-zoeklink als fallback, ook zonder resultaten', async () => {
    searchVideos.mockResolvedValue({ data: { videos: [], fallback: 'https://www.youtube.com/results?search_query=x', source: 'budget' }, error: null })
    render(<VideoSearch subject="biologie" />)
    fireEvent.change(screen.getByLabelText('Onderwerp'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /Zoek/ }))
    const link = await screen.findByRole('link', { name: /Zoek verder op YouTube/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=x')
  })

  it('toont een foutmelding bij een fout', async () => {
    searchVideos.mockResolvedValue({ data: null, error: 'network' })
    render(<VideoSearch subject="biologie" />)
    fireEvent.change(screen.getByLabelText('Onderwerp'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /Zoek/ }))
    expect(await screen.findByText(/Geen verbinding/)).toBeInTheDocument()
  })
})
