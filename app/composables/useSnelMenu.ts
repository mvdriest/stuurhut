// Gedeelde staat voor de twee globale vensters: het ⌘K-snelmenu en "Nieuw traject".
// Zo kan elke pagina (en het snelmenu zelf) ze openen zonder ze zelf te mounten.
export function useSnelMenu() {
  const open = useState('snelmenu-open', () => false)
  const nieuwTrajectOpen = useState('nieuw-traject-open', () => false)
  const nieuwTrajectZin = useState('nieuw-traject-zin', () => '')

  function openNieuwTraject(zin = '') {
    nieuwTrajectZin.value = zin
    open.value = false
    nieuwTrajectOpen.value = true
  }

  return { open, nieuwTrajectOpen, nieuwTrajectZin, openNieuwTraject }
}
