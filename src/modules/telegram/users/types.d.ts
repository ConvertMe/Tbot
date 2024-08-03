export interface UserI {
    id: number
    login: string
    phone?: string | null
    name?: string | null
    role: string
    lastResComplexId: number | null
    isDisabled: boolean
    createdAt: Date
}