// Zachte, spaarzame beweging met GSAP. Alleen transform en opacity, kort en met power2.out.
// Bij prefers-reduced-motion staat alles direct op zijn plek.
import type { Ref } from 'vue'
import { gsap } from 'gsap'

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useMotion(scope?: Ref<HTMLElement | null>) {
  let mm: gsap.MatchMedia | null = null

  /** Kaarten met [data-enter] schuiven rustig binnen, met een korte stagger. */
  function enter(selector = '[data-enter]', opts: { y?: number, stagger?: number } = {}) {
    if (!scope?.value) return
    mm?.revert()
    mm = gsap.matchMedia(scope.value)
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(selector, {
        y: opts.y ?? 14,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: opts.stagger ?? 0.05,
        clearProps: 'transform,opacity',
      })
    })
  }

  onMounted(() => nextTick(() => enter()))
  onBeforeUnmount(() => {
    mm?.revert()
    mm = null
  })

  return { enter }
}

/** Een element zacht laten verschijnen (bijv. een nieuw voorstel). */
export function softAppear(el: Element | null, delay = 0) {
  if (!el || prefersReduced()) return
  gsap.fromTo(el, { opacity: 0, y: 8, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, delay, ease: 'power2.out', clearProps: 'transform,opacity' })
}

/** Een item "verhuist" naar een navigatiedoel (bijv. Week). Een kloon vliegt erheen. */
export function flyTo(el: Element | null, target = 'week') {
  if (!el || prefersReduced()) return
  const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-nav="${target}"]`))
  const dest = targets.find(t => t.offsetParent !== null)
  if (!dest) return
  const a = el.getBoundingClientRect()
  const b = dest.getBoundingClientRect()
  const clone = el.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    margin: '0', zIndex: '80', pointerEvents: 'none', transformOrigin: 'top left',
  })
  document.body.appendChild(clone)
  const scale = Math.max(0.08, Math.min(0.3, b.width / a.width))
  gsap.to(clone, {
    x: b.left + b.width / 2 - a.left - (a.width * scale) / 2,
    y: b.top + b.height / 2 - a.top - (a.height * scale) / 2,
    scale,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => {
      clone.remove()
      gsap.fromTo(dest, { scale: 1 }, { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' })
    },
  })
}
