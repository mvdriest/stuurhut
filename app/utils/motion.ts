export const MOTION = {
  duration: {
    enter: 0.5, // staggered entrance per folder-tab row (seconds)
    stagger: 0.07, // delay offset between consecutive rows
    expand: 0.35, // expand/collapse a tab's detail content
    hover: 0.15 // mirrored by the plain CSS hover transition in FolderTab.vue
  },
  ease: {
    enter: 'power3.out',
    expand: 'power2.inOut'
  },
  enterOffsetY: 28 // px, initial translateY before the entrance tween
} as const
