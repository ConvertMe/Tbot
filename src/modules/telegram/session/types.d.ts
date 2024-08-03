import { UserI } from "../users/types"

export interface StructDBSessionI {
    id: number
    userId: number
    launched: 0 | 1 | boolean
    session: SessionI
}

export interface HandlerSessionI {
    id: number
    user: UserI
    launched: 0 | 1 | boolean
    session: SessionI
}

export interface SessionI {
    phoneRecorded: boolean
    nameRecorded: boolean
    resComplexId: number | null
    content: {
        images: string[]
        videos: string[]
    }
    geo: {
        onSpot: boolean
        geolocation: any | null
        description: string | null
    }
    description: string | null
}

export interface ComplexI {
    id: number
    name: string
    createdAt: string
}