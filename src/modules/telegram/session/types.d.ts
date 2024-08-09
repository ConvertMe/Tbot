import { UserI } from "../users/types"

export interface StructDBSessionI {
    id: number
    hash: string
    userId: number
    launched: 0 | 1 | boolean
    session: SessionI
}

export interface HandlerSessionI {
    id: number
    hash: string
    user: UserI
    launched: 0 | 1 | boolean
    session: SessionI
}

export interface SessionI {
    phoneRecorded: boolean
    nameRecorded: boolean
    resComplexId: number | null
    content: {
        process: "notStarted" | "streamOn" | "streamEnd"
        images: string[]
        videos: string[]
    }
    geo: {
        type: "onSpot" | "geo" | "description" | "empty"
        geolocation: string | null
    }
    description: string | null
}

export interface ComplexI {
    id: number
    name: string
    createdAt: string
}