export interface UserI {
    id: number
    login: string
    phone?: string | null
    name?: string | null
    role: string
    isDisabled: boolean
    createdAt: Date
}