import { useMemo } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import type { WillSection } from '../types/will.ts'

interface SectionInfo {
  key: WillSection
  label: string
  isComplete: boolean
  isCurrent: boolean
}

/** Base sections always present in the wizard */
const BASE_SECTIONS: { key: WillSection; label: string }[] = [
  { key: 'personal', label: 'Personal' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
  { key: 'assets', label: 'Assets' },
  { key: 'guardians', label: 'Guardians' },
  { key: 'executor', label: 'Executor' },
  { key: 'bequests', label: 'Bequests' },
  { key: 'residue', label: 'Residue' },
]

/** Sections that must be completed before the will can be reviewed */
const REQUIRED_SECTIONS: WillSection[] = [
  'personal',
  'beneficiaries',
  'executor',
  'residue',
]

/** Total base sections (excludes complex + review) */
const BASE_SECTION_COUNT = 7

export function useWillProgress() {
  const sectionsComplete = useWillStore((s) => s.sectionsComplete)
  const currentSection = useWillStore((s) => s.currentSection)
  const scenarios = useWillStore((s) => s.scenarios)
  const jointWill = useWillStore((s) => s.jointWill)

  return useMemo(() => {
    // Build dynamic complex section list based on active scenarios
    const complexSections: { key: WillSection; label: string }[] = []

    const hasTrust = scenarios.includes('testamentary_trust') || scenarios.includes('blended_family')
    const hasUsufruct = scenarios.includes('usufruct')
    const hasBusiness = scenarios.includes('business_assets')
    const hasJoint = !!jointWill.willStructure

    if (hasTrust) complexSections.push({ key: 'trust', label: 'Trust' })
    if (hasUsufruct) complexSections.push({ key: 'usufruct', label: 'Usufruct' })
    if (hasBusiness) complexSections.push({ key: 'business', label: 'Business' })
    if (hasJoint) complexSections.push({ key: 'joint', label: 'Joint Will' })

    // Full section config: base + complex + review
    const sectionConfig = [
      ...BASE_SECTIONS,
      ...complexSections,
      { key: 'review' as WillSection, label: 'Review' },
    ]

    const sections: SectionInfo[] = sectionConfig.map(({ key, label }) => ({
      key,
      label,
      isComplete: sectionsComplete[key] ?? false,
      isCurrent: currentSection === key,
    }))

    // Total trackable sections = base + complex (excludes review)
    const totalSections = BASE_SECTION_COUNT + complexSections.length

    const completedCount = Object.entries(sectionsComplete)
      .filter(([key, done]) => {
        if (key === 'review') return false
        // Only count complex sections that are currently active
        const isComplex = ['trust', 'usufruct', 'business', 'joint'].includes(key)
        if (isComplex) {
          return done && complexSections.some((cs) => cs.key === key)
        }
        return done
      })
      .length

    const isAllComplete = completedCount === totalSections

    const canReview = REQUIRED_SECTIONS.every(
      (section) => sectionsComplete[section] === true,
    )

    // Active complex section keys for WillWizard conditional rendering
    const activeComplexSections: WillSection[] = complexSections.map((cs) => cs.key)

    return {
      sections,
      completedCount,
      totalSections,
      isAllComplete,
      canReview,
      activeComplexSections,
    }
  }, [sectionsComplete, currentSection, scenarios, jointWill.willStructure])
}
