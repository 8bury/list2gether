import { Link } from 'react-router-dom'
import mainBanner from '@assets/mainbanner.png'
import coupleWatching from '@assets/couple_watching_movie.png'
import movieScene from '@assets/movie_scene.png'
import variousPosters from '@assets/various_movie_posters.png'
import interests from '@assets/interests.png'
import connect from '@assets/connect.png'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <section className="relative min-h-[100dvh] w-full flex items-center justify-center">
        <div className="absolute inset-0">
          <img 
            src={mainBanner}
            alt="Hero background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/100"></div>
        </div>

        <header className="absolute top-0 left-0 right-0 z-20 p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-xl font-semibold">List2gether</div>
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/login" className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition-colors">Login</Link>
              <Link to="/registro" className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition-colors">Create Account</Link>
            </nav>
          </div>
        </header>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <h1 className="text-6xl font-bold mb-6">List2gether</h1>
          <p className="text-xl text-gray-300 mb-8">The social network for couples who are film lovers</p>
          <Link 
            to="/registro" 
            className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start Now
          </Link>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-4xl font-bold mb-6">Share taste, discover stories, experience emotions.</h2>
              <p className="text-gray-400 mb-8">"This made me cry so hard"</p>
              <Link to="/registro" className="inline-block px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                Let's Try - it's free!
              </Link>
            </div>
            <div className="bg-gray-800 rounded-lg h-80 flex items-center justify-center text-gray-400 overflow-hidden">
              <img src={coupleWatching} alt="Couple watching movie" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="bg-gray-800 rounded-lg h-80 flex items-center justify-center text-gray-400 lg:order-1 overflow-hidden">
              <img src={movieScene} alt="Movie scene" className="w-full h-full object-cover" />
            </div>
            <div className="lg:order-2">
              <h2 className="text-4xl font-bold mb-6">Find out which movies are best for you and your friends.</h2>
              <p className="text-gray-400 mb-8">"definitely one of the best f**** ever"</p>
              <Link to="/registro" className="inline-block px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                Get Start - What you waiting for?
              </Link>
            </div>
          </div>

          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-12">More than just watching, it's about talking and connecting.</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <div className="bg-gray-800 rounded-lg h-80 mb-6 flex items-center justify-center text-gray-400 overflow-hidden">
                  <img src={variousPosters} alt="Various movie posters" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-semibold">Your list, your vibe</h3>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="bg-gray-800 rounded-lg h-36 mb-4 flex items-center justify-center text-gray-400 overflow-hidden">
                    <img src={interests} alt="Matching interests" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-lg font-semibold">Matching Interests</h3>
                </div>
                <div>
                  <div className="bg-gray-800 rounded-lg h-36 mb-4 flex items-center justify-center text-gray-400 overflow-hidden">
                    <img src={connect} alt="Stories that connect" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-lg font-semibold">Stories that connect</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <h2 className="text-4xl font-bold mb-12">What can you do...</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75zm3.5 2a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9zm0 4a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Make custom lists together (or not)</h3>
                <p className="text-gray-400 text-sm">
                  Create custom lists shared with your loved one, your best friends, or even your own personal list of favorite movies and TV shows.
                </p>
              </div>

              <div>
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M3.75 4A1.75 1.75 0 0 0 2 5.75v9.5C2 16.44 2.56 17 3.25 17H7v3.25a.75.75 0 0 0 1.28.53L12.06 17h8.19A1.75 1.75 0 0 0 22 15.25v-9.5A1.75 1.75 0 0 0 20.25 4H3.75zM6 8.25A.75.75 0 0 1 6.75 7.5h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 8.25zm0 3.5a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Write and share reviews</h3>
                <p className="text-gray-400 text-sm">
                  Write reviews about what you watched, discuss it with your friends or the entire community.
                </p>
              </div>

              <div>
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Rate each film</h3>
                <p className="text-gray-400 text-sm">
                  Rate everything you've watched, give it a rating, and see what best suits your taste and that of your partner.
                </p>
              </div>

              <div>
                <div className="w-8 h-8 text-white mb-4" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M6.75 3A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h10.5A2.75 2.75 0 0 0 20 18.25V5.75A2.75 2.75 0 0 0 17.25 3H6.75zM8 7.75A.75.75 0 0 1 8.75 7h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 8 7.75zM8 11.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75zm0 3.5a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Keep a diary of what you've been watching</h3>
                <p className="text-gray-400 text-sm">
                  Keep a journal of what you've watched, what you'd never watch, and what you want to watch someday.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">List2gether</h3>
            </div>
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Contact</li>
                <li>Help</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Terms</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Made by fans in Brazil</li>
                <li>Film data from TMDB</li>
                <li>Mobile site</li>
              </ul>
            </div>
            <div>
              <div className="flex space-x-4">
                <div className="w-6 h-6 bg-gray-600 rounded"></div>
                <div className="w-6 h-6 bg-gray-600 rounded"></div>
                <div className="w-6 h-6 bg-gray-600 rounded"></div>
                <div className="w-6 h-6 bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
