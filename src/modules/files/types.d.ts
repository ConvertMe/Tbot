export interface ContentFileI {
    id: number
    telegramFileId: string
    userId: number
    fileHash: string
    sessionHash: string
    format: "video" | "img"
    createdAt: Date
}

export interface TelegramResponseGetLinkI {
    ok: boolean,
    result: {
      file_id: string
      file_unique_id: string
      file_size: number
      file_path: number
    }
  }

export interface GarbageСollectorFilesI {
    id: number
    pathToFile: string
    createdAt: Date
}