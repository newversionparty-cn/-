import { create } from 'zustand'

export type LeapStep = 'locate' | 'evaluate' | 'assess' | 'prepare'

export interface AssetLocation {
  id: string
  name: string
  lat: number
  lng: number
  sensitivity?: 'high' | 'medium' | 'low'
}

export interface AssetProtection {
  inProtected: boolean  // within a protected area
  nearProtected: boolean // within 50km of a protected area
  distance: number       // km to nearest protected area boundary
}

export interface IndustryImpact {
  category: string
  dependencies: string[]
  impacts: string[]
}

interface LeapState {
  currentStep: LeapStep
  assets: AssetLocation[]
  assetProtections: Record<string, AssetProtection>  // assetId -> protection info
  sector: string
  industryData: IndustryImpact | null
  assessmentResult: string
  isLoading: boolean

  setStep: (step: LeapStep) => void
  setAssets: (assets: AssetLocation[]) => void
  setAssetProtections: (protections: Record<string, AssetProtection>) => void
  setSector: (sector: string) => void
  setIndustryData: (data: IndustryImpact | null) => void
  setAssessmentResult: (result: string) => void
  setIsLoading: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  currentStep: 'locate' as LeapStep,
  assets: [],
  assetProtections: {},
  sector: '',
  industryData: null,
  assessmentResult: '',
  isLoading: false,
}

export const useLeapStore = create<LeapState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  setAssets: (assets) => set({ assets }),
  setAssetProtections: (assetProtections) => set({ assetProtections }),
  setSector: (sector) => set({ sector }),
  setIndustryData: (industryData) => set({ industryData }),
  setAssessmentResult: (assessmentResult) => set({ assessmentResult }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),
}))
