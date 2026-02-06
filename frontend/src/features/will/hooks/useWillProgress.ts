import { useMemo } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import type { WillSection } from '../types/will.ts'

interface SectionInfo {
  key: WillSection
  label: string
  isComplete: boolean
  isCurrent: boolean
}

/** Section order and display labels */
const SECTION_CONFIG: { key: WillSection; label: string }[] = [
  { key: 'personal', label: 'Personal' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
  { key: 'assets', label: 'Assets' },
  { key: 'guardians', label: 'Guardians' },
  { key: 'executor', label: 'Executor' },
  { key: 'bequests', label: 'Bequests' },
  { key: 'residue', label: 'Residue' },
  { key: 'review', label: 'Review' },
]

/** Sections that must be completed before the will can be reviewed */
const REQUIRED_SECTIONS: WillSection[] = [
  'personal',
  'beneficiaries',
  'executor',
  'residue',
]

/** Total trackable sections (excludes 'review' which is a meta-section) */
const TOTAL_SECTIONS = 7

export function useWillProgress() {
  const sectionsComplete = useWillStore((s) => s.sectionsComplete)
  const currentSection = useWillStore((s) => s.currentSection)

  return useMemo(() => {
    const sections: SectionInfo[] = SECTION_CONFIG.map(({ key, label }) => ({
      key,
      label,
      isComplete: sectionsComplete[key] ?? false,
      isCurrent: currentSection === key,
    }))

    const completedCount = Object.values(sectionsComplete).filter(Boolean).length

    const isAllComplete = completedCount === TOTAL_SECTIONS

    const canReview = REQUIRED_SECTIONS.every(
      (section) => sectionsComplete[section] === true,
    )

    return {
      sections,
      completedCount,
      totalSections: TOTAL_SECTIONS,
      isAllComplete,
      canReview,
    }
  }, [sectionsComplete, currentSection])
}
