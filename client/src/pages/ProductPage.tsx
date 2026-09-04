import { Link } from 'react-router-dom'
import { MarketingShell, marketingContainer } from '../components/marketing/MarketingShell'

/*
 * Landing page intentionally paused.
 * The previous ProductPage design was removed from the live route because it did
 * not match the desired direction. Keep this component minimal until a new
 * landing-page direction is chosen.
 */
export function ProductPage() {
  return (
    <MarketingShell>
      <section className="bg-white py-20">
        <div className={marketingContainer}>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6d45c2]">
              WorkSync
            </p>
            <h1 className="mt-5 text-[2.75rem] font-semibold leading-tight text-[#07111f]">
              Landing page paused
            </h1>
            <p className="mt-5 text-base leading-7 text-[#667085]">
              The current landing page design has been commented out while we choose a
              better direction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#1a1a1a] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#2f2f2f]"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl border border-[#1a1a1a] px-6 py-3 text-base font-semibold text-[#1a1a1a] transition-colors hover:bg-[#f7f7f7]"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
