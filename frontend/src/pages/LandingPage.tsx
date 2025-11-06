import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { logout as logoutApi } from '../services/auth'
import mainBanner from '@assets/mainbanner.png'
import coupleWatching from '@assets/couple_watching_movie.png'
import movieScene from '@assets/movie_scene.png'
import variousPosters from '@assets/various_movie_posters.png'
import interests from '@assets/interests.png'
import connect from '@assets/connect.png'

export default function LandingPage() {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isLoggedIn = useMemo(() => {
    const access = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    return Boolean(access && refresh)
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll('[data-animate]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement
          if (entry.isIntersecting) {
            el.classList.add('opacity-100', 'translate-y-0')
            el.classList.remove('opacity-0', 'translate-y-6')
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.2 }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <section className="relative min-h-[100dvh] w-full flex items-center justify-center">
        <div className="absolute inset-0">
          <img 
            src={mainBanner}
            alt="Hero background" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black"></div>
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0)_40%)]"></div>
        </div>

        <header className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 bg-black/30 border-b border-white/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-lg sm:text-xl font-semibold tracking-tight">list2gether</div>
            <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm" aria-label="Primary">
              {isLoggedIn ? (
                <>
                  <Link to="/home" className="no-underline px-3 py-2 sm:px-4 sm:py-2 bg-white/10 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">Listas</Link>
                  <button
                    type="button"
                    onClick={async () => {
                      if (isLoggingOut) return
                      setIsLoggingOut(true)
                      try {
                        const refreshToken = localStorage.getItem('refresh_token')
                        const accessToken = localStorage.getItem('access_token')
                        if (refreshToken && accessToken) {
                          await logoutApi(refreshToken)
                        }
                      } catch (_) {
                      } finally {
                        localStorage.removeItem('access_token')
                        localStorage.removeItem('refresh_token')
                        localStorage.removeItem('user')
                        setIsLoggingOut(false)
                        navigate('/login')
                      }
                    }}
                    disabled={isLoggingOut}
                    aria-busy={isLoggingOut}
                    className="inline-flex items-center bg-white text-black font-semibold rounded px-3 py-2 sm:px-4 sm:py-2 border border-white hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? 'Saindo…' : 'Sair'}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="no-underline min-w-[120px] text-center px-3 py-2 sm:px-4 sm:py-2 bg-white/10 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">Login</Link>
                  <Link to="/registro" className="no-underline min-w-[120px] text-center px-3 py-2 sm:px-4 sm:py-2 bg-white text-black rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">Create Account</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] pb-1 mb-4 sm:mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">list2gether</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8">The social network for movie‑loving couples and friends</p>
          <Link 
            to="/registro" 
            className="no-underline inline-block px-6 py-3 sm:px-8 sm:py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg shadow-white/10"
          >
            Get started — it’s free
          </Link>
        </div>

        <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center">
          <a
            href="#features"
            className="group inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors no-underline"
            onClick={(e) => {
              e.preventDefault()
              const el = document.getElementById('features')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <span className="text-xs uppercase tracking-widest">Explore</span>
            <svg className="w-5 h-5 animate-bounce" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 16.5a1 1 0 0 1-.7-.3l-6-6a1 1 0 1 1 1.4-1.4L12 14.1l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-.7.3z"/>
            </svg>
          </a>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center mb-16 lg:mb-20">
            <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">Share taste, discover stories, experience emotions.</h2>
              <p className="text-gray-400 mb-6 md:mb-8">"This made me cry so hard"</p>
              <Link to="/registro" className="no-underline inline-block px-5 py-2.5 md:px-6 md:py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors">
                Try it free
              </Link>
            </div>
            <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform bg-white/5 border border-white/10 rounded-lg h-48 sm:h-64 lg:h-80 flex items-center justify-center text-gray-400 overflow-hidden transition-transform hover:-translate-y-1">
              <img src={coupleWatching} alt="Couple watching movie" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center mb-16 lg:mb-20">
            <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform bg-white/5 border border-white/10 rounded-lg h-48 sm:h-64 lg:h-80 flex items-center justify-center text-gray-400 lg:order-1 overflow-hidden transition-transform hover:-translate-y-1">
              <img src={movieScene} alt="Movie scene" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform lg:order-2">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">Find the right movies for you and your friends.</h2>
              <p className="text-gray-400 mb-6 md:mb-8">"Definitely one of the best ever"</p>
              <Link to="/registro" className="no-underline inline-block px-5 py-2.5 md:px-6 md:py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors">
                Get started
              </Link>
            </div>
          </div>

          <div className="text-center mb-20">
            <h2 data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12">More than just watching, it's about talking and connecting.</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform">
                <div className="bg-white/5 border border-white/10 rounded-lg h-56 sm:h-64 lg:h-80 mb-4 md:mb-6 flex items-center justify-center text-gray-400 overflow-hidden">
                  <img src={variousPosters} alt="Various movie posters" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold">Your list, your vibe</h3>
              </div>

              <div className="space-y-8">
                <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform">
                  <div className="bg-white/5 border border-white/10 rounded-lg h-28 sm:h-32 md:h-36 mb-3 md:mb-4 flex items-center justify-center text-gray-400 overflow-hidden">
                    <img src={interests} alt="Matching interests" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold">Matching Interests</h3>
                </div>
                <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform">
                  <div className="bg-white/5 border border-white/10 rounded-lg h-28 sm:h-32 md:h-36 mb-3 md:mb-4 flex items-center justify-center text-gray-400 overflow-hidden">
                    <img src={connect} alt="Stories that connect" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold">Stories that connect</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12">What you can do</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform rounded-xl bg-white/5 border border-white/10 p-6 hover:border-white/20">
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75zm3.5 2a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9zm0 4a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Create shared or personal lists</h3>
                <p className="text-gray-400 text-sm">Create lists with your partner, friends, or just for yourself.</p>
              </div>

              <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform delay-100 rounded-xl bg-white/5 border border-white/10 p-6 hover:border-white/20">
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M3.75 4A1.75 1.75 0 0 0 2 5.75v9.5C2 16.44 2.56 17 3.25 17H7v3.25a.75.75 0 0 0 1.28.53L12.06 17h8.19A1.75 1.75 0 0 0 22 15.25v-9.5A1.75 1.75 0 0 0 20.25 4H3.75zM6 8.25A.75.75 0 0 1 6.75 7.5h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 8.25zm0 3.5a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Write and share reviews</h3>
                <p className="text-gray-400 text-sm">Review what you watched and discuss with your friends or the community.</p>
              </div>

              <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform delay-200 rounded-xl bg-white/5 border border-white/10 p-6 hover:border-white/20">
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Rate each film</h3>
                <p className="text-gray-400 text-sm">Rate what you watch and see what best fits your shared taste.</p>
              </div>

              <div data-animate className="opacity-0 translate-y-6 transition-all duration-700 ease-out will-change-transform delay-300 rounded-xl bg-white/5 border border-white/10 p-6 hover:border-white/20">
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M6.75 3A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h10.5A2.75 2.75 0 0 0 20 18.25V5.75A2.75 2.75 0 0 0 17.25 3H6.75zM8 7.75A.75.75 0 0 1 8.75 7h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 8 7.75zM8 11.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75zm0 3.5a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Keep a watch diary</h3>
                <p className="text-gray-400 text-sm">Track what you watched, what to skip, and what’s next.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h3 className="text-base md:text-lg font-semibold">list2gether</h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Made by fans in Brazil</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 mt-2 text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>© {new Date().getFullYear()} list2gether. All rights reserved.</span>
            <span>TMDB data used under license. This product is not endorsed by TMDB.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
