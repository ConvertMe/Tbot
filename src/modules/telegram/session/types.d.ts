export interface StructDBSessionI {
    id: number
    userId: number
    session: SessionI
}

export interface HandlerSessionI {
    id: number
    user: UserI
    session: SessionI
}

export interface SessionI {
    launched: boolean
    finished: boolean
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